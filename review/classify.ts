import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { actions as registeredActions } from "@/kit/blocks";
import { parseAppConfig } from "@/kit/config/loader";
import type { AppConfig } from "@/kit/config/schema";

export type RuleName =
  | "file_outside_apps"
  | "app_file_removed"
  | "non_yaml_in_apps"
  | "invalid_config"
  | "approval_changed"
  | "roles_changed"
  | "sensitive_visibility_changed"
  | "high_risk_action";

export type Rules = Record<RuleName, { enabled: boolean; reason: string }>;

export type ChangedFile = {
  /** Git status letter: A(dded), M(odified), D(eleted). Renames arrive as D + A. */
  status: "A" | "M" | "D";
  path: string;
  /** Contents on the base branch, if the file existed there. */
  base?: string;
  /** Contents on this branch, if the file still exists. */
  head?: string;
};

export type Classification = {
  decision: "SELF-SERVE" | "ESCALATE";
  reasons: string[];
};

export function loadRules(file = path.join(process.cwd(), "review", "rules.yaml")): Rules {
  return (YAML.parse(fs.readFileSync(file, "utf8")) as { rules: Rules }).rules;
}

function isAppConfigFile(file: string): boolean {
  return /^apps\/[^/]+\.ya?ml$/.test(file);
}

function safeParse(source: string, label: string): AppConfig | null {
  try {
    return parseAppConfig(source, label);
  } catch {
    return null;
  }
}

function approvalOf(config: AppConfig, use: string) {
  return config.actions.find((a) => a.use === use)?.approval ?? null;
}

function stable(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Compares parsed YAML keys, not text. Formatting changes alone never escalate. */
export function classify(changes: ChangedFile[], rules: Rules): Classification {
  const reasons: string[] = [];
  const add = (rule: RuleName, detail: string) => {
    if (!rules[rule]?.enabled) return;
    reasons.push(`${rules[rule].reason} (${detail})`);
  };

  for (const change of changes) {
    if (!change.path.startsWith("apps/")) {
      add("file_outside_apps", change.path);
      continue;
    }

    if (!isAppConfigFile(change.path)) {
      add("non_yaml_in_apps", change.path);
      continue;
    }

    if (change.status === "D") {
      add("app_file_removed", change.path);
      continue;
    }

    const head = change.head === undefined ? null : safeParse(change.head, change.path);
    if (!head) {
      add("invalid_config", change.path);
      continue;
    }

    const base = change.base === undefined ? null : safeParse(change.base, change.path);

    for (const entry of head.actions) {
      const action = registeredActions[entry.use];
      if (action?.risk === "high") {
        add("high_risk_action", `${change.path} uses ${entry.use}`);
      }
    }

    if (!base) {
      // New app: nothing to compare against, so only content rules apply.
      continue;
    }

    if (stable(base.roles) !== stable(head.roles)) {
      add("roles_changed", change.path);
    }
    if (stable(base.view.show_sensitive_to) !== stable(head.view.show_sensitive_to)) {
      add("sensitive_visibility_changed", change.path);
    }

    const uses = new Set([
      ...base.actions.map((a) => a.use),
      ...head.actions.map((a) => a.use),
    ]);
    for (const use of uses) {
      if (stable(approvalOf(base, use)) !== stable(approvalOf(head, use))) {
        add("approval_changed", `${change.path}: ${use}`);
      }
    }
  }

  return reasons.length > 0
    ? { decision: "ESCALATE", reasons }
    : { decision: "SELF-SERVE", reasons: [] };
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/** `git status --porcelain` lines are `XY<space><path>`, where X may be a space. */
export function porcelainPath(line: string): string {
  const rest = line.slice(3);
  const arrow = rest.indexOf(" -> ");
  return arrow === -1 ? rest : rest.slice(arrow + 4);
}

function showFile(ref: string, file: string): string | undefined {
  try {
    return git(["show", `${ref}:${file}`]);
  } catch {
    return undefined;
  }
}

export function changesAgainst(base: string): ChangedFile[] {
  const mergeBase = git(["merge-base", base, "HEAD"]).trim();
  const raw = git(["diff", "--name-status", mergeBase, "HEAD"]).trim();
  const files: ChangedFile[] = raw
    ? raw.split("\n").map((line) => {
        const [status, ...rest] = line.split("\t");
        const file = rest[rest.length - 1];
        const letter = status[0] as ChangedFile["status"];
        return {
          status: letter === "A" || letter === "D" ? letter : "M",
          path: file,
          base: showFile(mergeBase, file),
          head: showFile("HEAD", file),
        };
      })
    : [];

  // Uncommitted work counts too, so the classifier can run before committing.
  const dirty = git(["status", "--porcelain"]);
  for (const line of dirty.split("\n").filter((l) => l.length > 3)) {
    const file = porcelainPath(line);
    if (files.some((f) => f.path === file)) continue;
    const exists = fs.existsSync(path.join(process.cwd(), file));
    files.push({
      status: exists ? (showFile(mergeBase, file) ? "M" : "A") : "D",
      path: file,
      base: showFile(mergeBase, file),
      head: exists ? fs.readFileSync(path.join(process.cwd(), file), "utf8") : undefined,
    });
  }

  return files;
}
