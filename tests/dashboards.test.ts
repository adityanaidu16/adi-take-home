import { describe, expect, it } from "vitest";
import { lintDashboardSource } from "@/kit/sandbox";
import { getAppAggregate, getAppRows } from "@/kit/view";
import { classify, loadRules, withSandboxLint, type ChangedFile } from "@/review/classify";
import { priya, sam } from "./users";

const rules = loadRules();

const clean = `"use client";

import { useAppRows } from "@/kit/client";

export default function Dashboard({ app }: { app: string }) {
  const { rows } = useAppRows(app);
  return <div>{rows.length}</div>;
}
`;

const fetching = `"use client";

export default function Dashboard() {
  fetch("/api/apps/refunds/rows");
  return <div />;
}
`;

const prismaImporting = `"use client";

import { PrismaClient } from "@prisma/client";

export default function Dashboard() {
  return <div>{String(PrismaClient)}</div>;
}
`;

const dashboard = (status: ChangedFile["status"], head?: string): ChangedFile => ({
  status,
  path: "apps/refunds/dashboard.tsx",
  head,
});

describe("apps/** sandbox", () => {
  it("rejects a dashboard that fetches for itself", async () => {
    const violations = await lintDashboardSource(fetching, "apps/refunds/dashboard.tsx");
    expect(violations.map((v) => v.rule)).toContain("no-restricted-globals");
  });

  it("rejects a dashboard that imports Prisma", async () => {
    const violations = await lintDashboardSource(prismaImporting, "apps/refunds/dashboard.tsx");
    expect(violations.length).toBeGreaterThan(0);
  });

  it("allows the kit client API, React and Fluent", async () => {
    expect(await lintDashboardSource(clean, "apps/refunds/dashboard.tsx")).toEqual([]);
  });

  it("keeps the shipped refunds dashboard inside the sandbox", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("apps/refunds/dashboard.tsx", "utf8"),
    );
    expect(await lintDashboardSource(source, "apps/refunds/dashboard.tsx")).toEqual([]);
  });
});

describe("classifier on dashboards", () => {
  it("puts a lint-clean dashboard at SELF-SERVE", async () => {
    const changes = await withSandboxLint([dashboard("A", clean)]);
    const result = classify(changes, rules);
    expect(result.decision).toBe("SELF-SERVE");
    expect(result.notes.join(" ")).toContain("presentation-only; data access via kit");
  });

  it("escalates a dashboard that imports Prisma", async () => {
    const changes = await withSandboxLint([dashboard("M", prismaImporting)]);
    const result = classify(changes, rules);
    expect(result.decision).toBe("ESCALATE");
    expect(result.reasons.join(" ")).toContain("sandbox");
  });

  it("still escalates other code under apps/", () => {
    const result = classify([{ status: "A", path: "apps/refunds/helpers.ts", head: "" }], rules);
    expect(result.decision).toBe("ESCALATE");
  });
});

describe("kit client data path", () => {
  it("masks bank_account for an analyst and shows it to an approver", async () => {
    const analyst = await getAppRows("refunds", sam);
    expect(analyst.masked).toBe(true);
    expect(analyst.sensitiveColumns).toContain("bank_account");
    for (const row of analyst.rows) expect(String(row.bank_account)).toMatch(/^••••/);
    expect(analyst.rows.length).toBeLessThanOrEqual(1000);

    const approver = await getAppRows("refunds", priya);
    expect(approver.masked).toBe(false);
    expect(String(approver.rows[0].bank_account)).not.toMatch(/^••••/);
  });

  it("refuses to aggregate a sensitive field", async () => {
    await expect(
      getAppAggregate("refunds", sam, { groupBy: "status", measure: "bank_account" }),
    ).rejects.toThrow(/sensitive/);
    await expect(
      getAppAggregate("refunds", sam, { groupBy: "bank_account" }),
    ).rejects.toThrow(/sensitive/);
  });

  it("aggregates refund value by status on the server", async () => {
    const result = await getAppAggregate("refunds", sam, { groupBy: "status", measure: "amount" });
    expect(result.measure).toBe("amount");
    expect(result.groups.length).toBeGreaterThan(0);
    for (const group of result.groups) expect(Number.isFinite(group.value)).toBe(true);
  });
});
