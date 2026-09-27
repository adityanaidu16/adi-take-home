import { getSession } from "@/kit/auth/session";
import { prisma } from "@/kit/db";
import { LogTabs } from "@/kit/ui/LogTabs";
import { PageHeader } from "@/kit/ui/PageHeader";
import { SignInPrompt } from "@/kit/ui/SignInPrompt";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) return <SignInPrompt what="the audit log" />;

  const [entries, ledger] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.mockLedger.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Audit log" }]}
        title="Audit log"
        subtitle="Append-only. Every request, approval, cancellation and execution, newest first."
      />
      <LogTabs
        audit={{
          columns: ["when", "actor", "app", "action", "record"],
          rows: entries.map((entry) => ({
            id: entry.id,
            cells: [
              entry.createdAt.toISOString(),
              entry.actor,
              entry.app,
              entry.action,
              entry.recordId ?? "",
            ],
          })),
        }}
        ledger={{
          columns: ["when", "amount", "refund request", "approval request id"],
          rows: ledger.map((row) => ({
            id: row.id,
            cells: [
              row.createdAt.toISOString(),
              `${row.amount} ${row.currency}`,
              row.recordId,
              row.approvalRequestId,
            ],
          })),
        }}
      />
    </>
  );
}
