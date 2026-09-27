import type { Prisma } from "@prisma/client";
import { prisma } from "@/kit/db";

export type AuditEntry = {
  actor: string;
  app: string;
  action: string;
  recordId?: string | null;
  detail?: Prisma.InputJsonValue;
};

/**
 * Append-only. There is deliberately no update or delete path for AuditLog
 * anywhere in the kit; production would also revoke UPDATE/DELETE on the table.
 */
export async function audit(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      actor: entry.actor,
      app: entry.app,
      action: entry.action,
      recordId: entry.recordId ?? null,
      detail: entry.detail,
    },
  });
}
