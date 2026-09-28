import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

/**
 * The sandbox around `apps/**`. A dashboard is presentation, so it may import
 * React, Fluent and the kit client API and nothing else — no `fetch`, no
 * Prisma, no server actions. The rules themselves live in `.eslintrc.json`
 * under the `apps/**` override; this is the runner that `npm run validate`
 * and the review classifier share.
 */

export type SandboxViolation = { line: number; rule: string; message: string };

/** Matches a presentation file an app owns: `apps/<slug>/dashboard.tsx`. */
export const DASHBOARD_PATH = /^apps\/[^/]+\/dashboard\.tsx$/;

let engine: ESLint | null = null;
function eslint(): ESLint {
  engine ??= new ESLint({ cwd: process.cwd() });
  return engine;
}

function toViolations(results: ESLint.LintResult[]): SandboxViolation[] {
  return results
    .flatMap((result) => result.messages)
    .filter((m) => m.severity === 2)
    .map((m) => ({ line: m.line ?? 0, rule: m.ruleId ?? "parse-error", message: m.message }));
}

/** Lints one dashboard's source as if it sat at `filePath`, without writing it. */
export async function lintDashboardSource(
  source: string,
  filePath: string,
): Promise<SandboxViolation[]> {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return toViolations(await eslint().lintText(source, { filePath: absolute }));
}

/** Lints every dashboard currently in `apps/`. */
export async function lintApps(
  appsDir = path.join(process.cwd(), "apps"),
): Promise<Record<string, SandboxViolation[]>> {
  const out: Record<string, SandboxViolation[]> = {};
  if (!fs.existsSync(appsDir)) return out;

  for (const entry of fs.readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(appsDir, entry.name, "dashboard.tsx");
    if (!fs.existsSync(file)) continue;
    const relative = `apps/${entry.name}/dashboard.tsx`;
    out[relative] = await lintDashboardSource(fs.readFileSync(file, "utf8"), file);
  }
  return out;
}
