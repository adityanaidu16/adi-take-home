import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { classify, loadRules, type ChangedFile } from "./classify";

export type Member = { name: string; slack?: string; github?: string };
export type Owners = Record<string, Member[]>;

export type Approver = { kind: "slack" | "github"; handle: string };

export type ApprovalRecord = {
  approvedBy: string;
  identity: string;
  apps: { path: string; owner: string }[];
  decision: "SELF-SERVE";
  approvedAt: string;
};

export type Refusal = { ok: false; reason: string };
export type Granted = { ok: true; record: ApprovalRecord };

export function loadOwners(file = path.join(process.cwd(), "review", "owners.yaml")): Owners {
  return (YAML.parse(fs.readFileSync(file, "utf8")) as { teams: Owners }).teams;
}

/** `slack:U01MARIA` or `github:maria-ops`. */
export function parseApprover(value: string): Approver | null {
  const [kind, ...rest] = value.split(":");
  const handle = rest.join(":").trim().replace(/^@/, "");
  if (!handle) return null;
  if (kind !== "slack" && kind !== "github") return null;
  return { kind, handle };
}

function memberOf(owners: Owners, team: string, approver: Approver): Member | undefined {
  return (owners[team] ?? []).find(
    (m) => (approver.kind === "slack" ? m.slack : m.github) === approver.handle,
  );
}

function ownerOf(change: ChangedFile): string | null {
  if (!change.head) return null;
  const parsed = YAML.parse(change.head) as { owner?: unknown } | null;
  return typeof parsed?.owner === "string" ? parsed.owner : null;
}

/**
 * Decides whether a confirmation from chat is allowed to merge a change.
 *
 * The classification is recomputed here rather than taken from the caller: a
 * confirmation arriving over Slack must not be able to assert its own verdict.
 */
export function approve(
  changes: ChangedFile[],
  owners: Owners,
  approver: Approver,
  now = new Date(),
): Granted | Refusal {
  const verdict = classify(changes, loadRules());
  if (verdict.decision !== "SELF-SERVE") {
    return {
      ok: false,
      reason: `Change is ESCALATE, which needs an engineer:\n  - ${verdict.reasons.join("\n  - ")}`,
    };
  }

  const apps = changes.filter((c) => /^apps\/[^/]+\.ya?ml$/.test(c.path));
  if (apps.length === 0) return { ok: false, reason: "No app config changed; nothing to confirm." };

  const owned: { path: string; owner: string }[] = [];
  let approvedBy = approver.handle;
  for (const app of apps) {
    const owner = ownerOf(app);
    if (!owner) return { ok: false, reason: `${app.path} declares no owner team.` };
    const found = memberOf(owners, owner, approver);
    if (!found) {
      return {
        ok: false,
        reason: `${approver.kind}:${approver.handle} is not in "${owner}", which owns ${app.path}. Ask that team to confirm.`,
      };
    }
    approvedBy = found.name;
    owned.push({ path: app.path, owner });
  }

  return {
    ok: true,
    record: {
      approvedBy,
      identity: `${approver.kind}:${approver.handle}`,
      apps: owned,
      decision: "SELF-SERVE",
      approvedAt: now.toISOString(),
    },
  };
}
