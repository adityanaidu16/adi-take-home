import { beforeEach, describe, expect, it } from "vitest";
import { performAction, requestsRaisedBy } from "@/kit/approvals/engine";
import { parseAppConfig } from "@/kit/config/loader";
import { prisma } from "@/kit/db";
import { exportAppCsv, getAppView } from "@/kit/view";
import { priya, sam } from "./users";

const base = `
name: Refunds
owner: payments-ops
datasource: refund_requests
roles:
  analyst: [refunds-analysts]
  approver: [refunds-approvers]
view:
  columns: [customer_name, amount, status, bank_account]
  visible_to: [analyst, approver]
  show_sensitive_to: [approver]
  summary:
    group_by: status
    measure: amount
actions:
  - use: issue_refund
    allowed_roles: [analyst]
`;

async function reset() {
  await prisma.mockLedger.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.refundRequest.createMany({
    data: [
      {
        id: "big",
        customerName: "Ada Whitfield",
        amount: 1200,
        currency: "USD",
        reason: "Duplicate charge",
        bankAccount: "GB29NWBK60161331926819",
      },
      {
        id: "small",
        customerName: "Bruno Salas",
        amount: 240,
        currency: "USD",
        reason: "Cancelled subscription",
        bankAccount: "GB33BUKB20201555555555",
      },
    ],
  });
}

describe("declarative summary", () => {
  it("rejects grouping or totalling a sensitive field", () => {
    expect(() => parseAppConfig(base.replace("group_by: status", "group_by: bank_account"), "t.yaml")).toThrow(
      /sensitive/,
    );
    expect(() => parseAppConfig(base.replace("measure: amount", "measure: bank_account"), "t.yaml")).toThrow(
      /sensitive/,
    );
  });

  it("rejects a non-numeric measure and a field the view does not show", () => {
    expect(() => parseAppConfig(base.replace("measure: amount", "measure: status"), "t.yaml")).toThrow(
      /not a number/,
    );
    expect(() => parseAppConfig(base.replace("group_by: status", "group_by: currency"), "t.yaml")).toThrow(
      /not one of view.columns/,
    );
  });

  it("totals the measure per group from the authorized rows", async () => {
    await reset();
    const view = await getAppView("refunds", sam);

    expect(view.summary?.groups).toEqual([{ key: "open", value: 1440 }]);
  });
});

describe("audited export", () => {
  beforeEach(reset);

  it("exports the masked view for an analyst and the full value for an approver", async () => {
    const analystCsv = await exportAppCsv("refunds", sam);
    expect(analystCsv).not.toContain("GB29NWBK60161331926819");
    expect(analystCsv).toContain("•••• 6819");

    const approverCsv = await exportAppCsv("refunds", priya);
    expect(approverCsv).toContain("GB29NWBK60161331926819");
  });

  it("writes an audit row for every export", async () => {
    await exportAppCsv("refunds", sam);

    const events = await prisma.auditLog.findMany({ where: { action: "view.exported" } });
    expect(events).toHaveLength(1);
    expect(events[0].actor).toBe("sam");
    expect(events[0].detail).toMatchObject({ sensitiveMasked: true });
  });
});

describe("my requests", () => {
  beforeEach(reset);

  it("shows the requester their own pending request and nobody else's", async () => {
    await performAction("refunds", "issue_refund", "big", sam);

    const mine = await requestsRaisedBy(sam);
    expect(mine.map((r) => ({ record: r.recordId, status: r.status }))).toEqual([
      { record: "big", status: "pending" },
    ]);

    expect(await requestsRaisedBy(priya)).toEqual([]);
  });
});
