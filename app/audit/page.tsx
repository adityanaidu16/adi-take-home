import {
  Card,
  Link as FluentLink,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from "@fluentui/react-components";
import { getSession } from "@/kit/auth/session";
import { prisma } from "@/kit/db";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) {
    return (
      <Text>
        <FluentLink href="/api/auth/login">Sign in</FluentLink> to view the audit log.
      </Text>
    );
  }

  const [entries, ledger] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.mockLedger.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <section>
        <Text as="h1" size={600} weight="semibold">
          Audit log
        </Text>
        <div>
          <Text size={200}>Append-only. Newest first.</Text>
        </div>
        <Card style={{ marginTop: 16, padding: 0 }}>
          <Table size="small" aria-label="Audit log">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>when</TableHeaderCell>
                <TableHeaderCell>actor</TableHeaderCell>
                <TableHeaderCell>app</TableHeaderCell>
                <TableHeaderCell>action</TableHeaderCell>
                <TableHeaderCell>record</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.createdAt.toISOString()}</TableCell>
                  <TableCell>{entry.actor}</TableCell>
                  <TableCell>{entry.app}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.recordId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section>
        <Text as="h2" size={500} weight="semibold">
          Mock payment ledger
        </Text>
        <div>
          <Text size={200}>
            One row per executed refund. The approval request id is the idempotency key.
          </Text>
        </div>
        <Card style={{ marginTop: 16, padding: 0 }}>
          <Table size="small" aria-label="Mock payment ledger">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>when</TableHeaderCell>
                <TableHeaderCell>amount</TableHeaderCell>
                <TableHeaderCell>refund request</TableHeaderCell>
                <TableHeaderCell>approval request id</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.createdAt.toISOString()}</TableCell>
                  <TableCell>
                    {row.amount} {row.currency}
                  </TableCell>
                  <TableCell>{row.recordId}</TableCell>
                  <TableCell>{row.approvalRequestId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
