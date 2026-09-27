import { getSession } from "@/kit/auth/session";
import { prisma } from "@/kit/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) {
    return (
      <p className="text-sm">
        <a href="/api/auth/login" className="text-blue-700 underline">
          Sign in
        </a>{" "}
        to view the audit log.
      </p>
    );
  }

  const [entries, ledger] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.mockLedger.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-slate-500">Append-only. Newest first.</p>
        <table className="mt-4 w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="px-3 py-2 font-medium">when</th>
              <th className="px-3 py-2 font-medium">actor</th>
              <th className="px-3 py-2 font-medium">app</th>
              <th className="px-3 py-2 font-medium">action</th>
              <th className="px-3 py-2 font-medium">record</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b">
                <td className="px-3 py-2 text-slate-500">{entry.createdAt.toISOString()}</td>
                <td className="px-3 py-2">{entry.actor}</td>
                <td className="px-3 py-2">{entry.app}</td>
                <td className="px-3 py-2">{entry.action}</td>
                <td className="px-3 py-2 text-slate-500">{entry.recordId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Mock payment ledger</h2>
        <p className="text-sm text-slate-500">
          One row per executed refund. The approval request id is the idempotency key.
        </p>
        <table className="mt-4 w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b text-left text-slate-600">
              <th className="px-3 py-2 font-medium">when</th>
              <th className="px-3 py-2 font-medium">amount</th>
              <th className="px-3 py-2 font-medium">refund request</th>
              <th className="px-3 py-2 font-medium">approval request id</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-3 py-2 text-slate-500">{row.createdAt.toISOString()}</td>
                <td className="px-3 py-2">
                  {row.amount} {row.currency}
                </td>
                <td className="px-3 py-2 text-slate-500">{row.recordId}</td>
                <td className="px-3 py-2 text-slate-500">{row.approvalRequestId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
