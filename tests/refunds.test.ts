import { beforeEach, describe, expect, it } from "vitest";
import { approve, pendingRequestsFor, performAction } from "@/kit/approvals/engine";
import { prisma } from "@/kit/db";
import { AccessDenied, getAppView } from "@/kit/view";
import { maria, priya, sam } from "./users";

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

beforeEach(reset);

describe("refunds app", () => {
  it("masks bank_account for the analyst and shows it to the approver", async () => {
    const samView = await getAppView("refunds", sam);
    const priyaView = await getAppView("refunds", priya);

    expect(samView.rows[0].bank_account).toBe("•••• 6819");
    expect(priyaView.rows[0].bank_account).toBe("GB29NWBK60161331926819");
  });

  it("refuses a user whose groups map to no role on the app", async () => {
    await expect(getAppView("refunds", maria)).rejects.toBeInstanceOf(AccessDenied);
  });

  it("creates a pending request instead of paying out above $500", async () => {
    const outcome = await performAction("refunds", "issue_refund", "big", sam);

    expect(outcome.kind).toBe("pending");
    expect(await prisma.mockLedger.count()).toBe(0);
    expect(await prisma.approvalRequest.count({ where: { status: "pending" } })).toBe(1);
  });

  it("pays out immediately below the approval threshold", async () => {
    const outcome = await performAction("refunds", "issue_refund", "small", sam);

    expect(outcome.kind).toBe("executed");
    expect(await prisma.mockLedger.count()).toBe(1);
  });

  it("does not let the analyst approve, or the requester approve their own request", async () => {
    const outcome = await performAction("refunds", "issue_refund", "big", sam);
    if (outcome.kind !== "pending") throw new Error("expected pending");

    await expect(approve(outcome.requestId, sam)).rejects.toBeInstanceOf(AccessDenied);
    await expect(approve(outcome.requestId, maria)).rejects.toBeInstanceOf(AccessDenied);
    expect(await prisma.mockLedger.count()).toBe(0);
  });

  it("writes exactly one ledger row when the same request is approved twice", async () => {
    const outcome = await performAction("refunds", "issue_refund", "big", sam);
    if (outcome.kind !== "pending") throw new Error("expected pending");

    const first = await approve(outcome.requestId, priya);
    const second = await approve(outcome.requestId, priya);

    expect(first.kind).toBe("executed");
    expect(second.kind).toBe("already_decided");
    expect(await prisma.mockLedger.count()).toBe(1);
  });

  it("rejects a second ledger row for the same approval request at the database level", async () => {
    const outcome = await performAction("refunds", "issue_refund", "big", sam);
    if (outcome.kind !== "pending") throw new Error("expected pending");
    await approve(outcome.requestId, priya);

    await expect(
      prisma.mockLedger.create({
        data: {
          approvalRequestId: outcome.requestId,
          recordId: "big",
          amount: 1200,
          currency: "USD",
        },
      }),
    ).rejects.toThrow();
  });

  it("refuses to pay the same source record twice", async () => {
    await performAction("refunds", "issue_refund", "small", sam);

    await expect(performAction("refunds", "issue_refund", "small", sam)).rejects.toBeInstanceOf(
      AccessDenied,
    );
    expect(await prisma.mockLedger.count()).toBe(1);
  });

  it("pays once when two pending requests for one record are both approved", async () => {
    const first = await performAction("refunds", "issue_refund", "big", sam);
    const second = await performAction("refunds", "issue_refund", "big", sam);
    if (first.kind !== "pending" || second.kind !== "pending") throw new Error("expected pending");

    await approve(first.requestId, priya);
    const outcome = await approve(second.requestId, priya);

    expect(outcome.kind).toBe("cancelled");
    expect(await prisma.mockLedger.count()).toBe(1);
    expect(await prisma.approvalRequest.count({ where: { status: "cancelled" } })).toBe(1);
    expect(await pendingRequestsFor(priya)).toHaveLength(0);
  });

  it("records every step in the audit log", async () => {
    const outcome = await performAction("refunds", "issue_refund", "big", sam);
    if (outcome.kind !== "pending") throw new Error("expected pending");
    await approve(outcome.requestId, priya);

    const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(entries.map((e) => `${e.actor}:${e.action}`)).toEqual([
      "sam:issue_refund.requested",
      "priya:issue_refund.approved",
      "priya:issue_refund.executed",
    ]);
  });
});
