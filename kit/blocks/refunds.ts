import { prisma } from "@/kit/db";
import type { Action, DataSource, Row } from "./types";

function toRow(r: {
  id: string;
  customerName: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  bankAccount: string;
}): Row {
  return {
    id: r.id,
    customer_name: r.customerName,
    amount: r.amount,
    currency: r.currency,
    reason: r.reason,
    status: r.status,
    bank_account: r.bankAccount,
  };
}

export const refundRequests: DataSource = {
  name: "refund_requests",
  origin: "postgres",
  fields: [
    { name: "customer_name", type: "string" },
    { name: "amount", type: "number" },
    { name: "currency", type: "string" },
    { name: "reason", type: "string" },
    { name: "status", type: "string" },
    { name: "bank_account", type: "string", sensitive: true },
  ],
  read: async () => {
    const rows = await prisma.refundRequest.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toRow);
  },
  readOne: async (id) => {
    const row = await prisma.refundRequest.findUnique({ where: { id } });
    return row ? toRow(row) : null;
  },
};

export const issueRefund: Action = {
  name: "issue_refund",
  label: "Issue refund",
  datasource: "refund_requests",
  risk: "high",
  minApproval: {
    when: { field: "amount", gt: 500 },
    approverRoles: ["approver"],
  },
  appliesTo: (row) => row.status !== "refunded",
  execute: async ({ tx, row, approvalRequestId }) => {
    // Claim the source record first: two requests against the same refund, or a
    // stale page, must not both pay out. Only the transaction that flips the
    // status away from "pending" continues.
    const claimed = await tx.refundRequest.updateMany({
      where: { id: String(row.id), status: { not: "refunded" } },
      data: { status: "refunded" },
    });
    if (claimed.count !== 1) throw new Error("This refund has already been paid.");

    // Stands in for the payment provider call. The approval request id is the
    // idempotency key and is unique in the database, so a retry cannot double-pay.
    await tx.mockLedger.create({
      data: {
        approvalRequestId,
        recordId: String(row.id),
        amount: Number(row.amount),
        currency: String(row.currency),
      },
    });
  },
};
