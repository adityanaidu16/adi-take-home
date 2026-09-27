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
        <Card style={{ marginTop: 16, padding: 0, overflowX: "auto" }}>
          <Table as="table" size="small" aria-label="Audit log">
            <TableHeader as="thead">
              <TableRow as="tr">
                <TableHeaderCell as="th">when</TableHeaderCell>
                <TableHeaderCell as="th">actor</TableHeaderCell>
                <TableHeaderCell as="th">app</TableHeaderCell>
                <TableHeaderCell as="th">action</TableHeaderCell>
                <TableHeaderCell as="th">record</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody as="tbody">
              {entries.map((entry) => (
                <TableRow as="tr" key={entry.id}>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{entry.createdAt.toISOString()}</TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{entry.actor}</TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{entry.app}</TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{entry.action}</TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{entry.recordId}</TableCell>
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
        <Card style={{ marginTop: 16, padding: 0, overflowX: "auto" }}>
          <Table as="table" size="small" aria-label="Mock payment ledger">
            <TableHeader as="thead">
              <TableRow as="tr">
                <TableHeaderCell as="th">when</TableHeaderCell>
                <TableHeaderCell as="th">amount</TableHeaderCell>
                <TableHeaderCell as="th">refund request</TableHeaderCell>
                <TableHeaderCell as="th">approval request id</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody as="tbody">
              {ledger.map((row) => (
                <TableRow as="tr" key={row.id}>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{row.createdAt.toISOString()}</TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>
                    {row.amount} {row.currency}
                  </TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{row.recordId}</TableCell>
                  <TableCell as="td" style={{ whiteSpace: "nowrap" }}>{row.approvalRequestId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
