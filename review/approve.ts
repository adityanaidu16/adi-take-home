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

function ownerIn(source: string | undefined): string | null {
  if (!source) return null;
  try {
    const parsed = YAML.parse(source) as { owner?: unknown } | null;
    return typeof parsed?.owner === "string" ? parsed.owner : null;
  } catch {
    return null;
  }
}

/**
 * The owner as it stands on the base branch, so a change cannot nominate the
 * team that is about to confirm it. A new app has no base owner and can only
 * be confirmed by a member of the team it names.
 */
function ownerToAsk(change: ChangedFile): { owner: string | null; reassigned: boolean } {
  const base = ownerIn(change.base);
  const head = ownerIn(change.head);
  if (base && head && base !== head) return { owner: base, reassigned: true };
  return { owner: base ?? head, reassigned: false };
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
  // A dashboard-only change has no YAML in the diff, so the owner comes from
  // the app's governance file as it stands.
  for (const change of changes) {
    const slug = /^apps\/([^/]+)\/dashboard\.tsx$/.exec(change.path)?.[1];
    if (!slug || apps.some((a) => a.path.startsWith(`apps/${slug}.`))) continue;
    const file = ["yaml", "yml"]
      .map((ext) => path.join(process.cwd(), "apps", `${slug}.${ext}`))
      .find((candidate) => fs.existsSync(candidate));
    if (!file) return { ok: false, reason: `${change.path} has no apps/${slug}.yaml.` };
    apps.push({ status: "M", path: `apps/${slug}.yaml`, base: fs.readFileSync(file, "utf8") });
  }
  if (apps.length === 0) return { ok: false, reason: "No app config changed; nothing to confirm." };

  const owned: { path: string; owner: string }[] = [];
  let approvedBy = approver.handle;
  for (const app of apps) {
    const { owner, reassigned } = ownerToAsk(app);
    if (!owner) return { ok: false, reason: `${app.path} declares no owner team.` };
    if (reassigned) {
      return {
        ok: false,
        reason: `${app.path} changes owner away from "${owner}". Handing an app to another team is an engineering review, not a confirmation.`,
      };
    }
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
