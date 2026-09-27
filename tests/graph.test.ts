import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "@/dev/graph-mock/server";
import { performAction } from "@/kit/approvals/engine";
import { refundExceptions, updateExceptionStatus } from "@/kit/blocks/graph";
import { resetTokenCache } from "@/kit/blocks/graph/client";
import { parseAppConfig } from "@/kit/config/loader";
import { prisma } from "@/kit/db";
import { canSeeSensitive, rolesFor } from "@/kit/auth/roles";
import { mask } from "@/kit/view";
import fs from "node:fs";
import path from "node:path";
import { priya, sam } from "./users";

let server: Server;
const PORT = 8099;

const exceptionsApp = `
name: Refund exceptions
owner: payments-ops
datasource: refund_exceptions
roles:
  analyst: [refunds-analysts]
  approver: [refunds-approvers]
view:
  columns: [customer_name, amount, exception_reason, status, customer_iban]
  visible_to: [analyst, approver]
  show_sensitive_to: [approver]
actions:
  - use: update_exception_status
    allowed_roles: [analyst]
`;

beforeAll(async () => {
  server = createServer();
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  process.env.GRAPH_BASE_URL = `http://localhost:${PORT}`;
  process.env.GRAPH_TOKEN_URL = `http://localhost:${PORT}/token`;
  process.env.GRAPH_CLIENT_ID = "test-client";
  process.env.GRAPH_CLIENT_SECRET = "test-secret";
  resetTokenCache();
  fs.writeFileSync(path.join(process.cwd(), "apps", "__test-exceptions.yaml"), exceptionsApp);
});

afterAll(async () => {
  fs.rmSync(path.join(process.cwd(), "apps", "__test-exceptions.yaml"), { force: true });
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(async () => {
  await prisma.mockLedger.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.auditLog.deleteMany();
});

describe("SharePoint data through Microsoft Graph", () => {
  it("reads every page, following @odata.nextLink", async () => {
    const rows = await refundExceptions.read();

    expect(rows).toHaveLength(3);
    expect(rows[0].customer_name).toBe("Ada Whitfield");
    expect(rows[2].customer_name).toBe("Chen Wei");
  });

  it("masks the IBAN for roles without show_sensitive_to", async () => {
    const config = parseAppConfig(exceptionsApp, "test.yaml");
    const row = (await refundExceptions.read())[0];
    const iban = String(row.customer_iban);

    expect(canSeeSensitive(config, rolesFor(config, sam))).toBe(false);
    expect(mask(iban)).toBe("•••• 6819");
    expect(canSeeSensitive(config, rolesFor(config, priya))).toBe(true);
  });

  it("writes the status back to SharePoint and records it in the audit log", async () => {
    const outcome = await performAction("__test-exceptions", "update_exception_status", "2", sam);
    expect(outcome.kind).toBe("executed");

    const rows = await refundExceptions.read();
    expect(rows.find((r) => r.id === "2")?.status).toBe("Resolved");

    const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(entries.map((e) => e.action)).toEqual([
      "update_exception_status.requested",
      "update_exception_status.executed",
    ]);
  });

  it("refuses a Graph write from a user without the role", async () => {
    await expect(
      performAction("__test-exceptions", "update_exception_status", "1", priya),
    ).rejects.toThrow(/may not run/);
  });
});

describe("action naming", () => {
  it("declares the Graph action against its own data source", () => {
    expect(updateExceptionStatus.datasource).toBe("refund_exceptions");
  });
});
