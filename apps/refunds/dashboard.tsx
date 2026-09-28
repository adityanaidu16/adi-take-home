"use client";

import { useState } from "react";
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Card,
  CardHeader,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
} from "@fluentui/react-components";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { runAction, useAppAggregate, useAppRows } from "@/kit/client";

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function RefundsDashboard({ app }: { app: string }) {
  const rows = useAppRows(app);
  const valueByStatus = useAppAggregate(app, { groupBy: "status", measure: "amount" });
  const countByStatus = useAppAggregate(app, { groupBy: "status" });
  const [busy, setBusy] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const error = rows.error ?? valueByStatus.error ?? countByStatus.error;
  if (error) return <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>;
  if (rows.loading || valueByStatus.loading || countByStatus.loading) {
    return <Spinner label="Loading refunds…" />;
  }

  const openCount = countByStatus.groups.find((g) => g.key === "open")?.value ?? 0;
  const openValue = valueByStatus.groups.find((g) => g.key === "open")?.value ?? 0;
  const refunded = valueByStatus.groups.find((g) => g.key === "refunded")?.value ?? 0;
  const awaiting = new Set([...rows.pendingRowIds, ...submitted]);
  const largest = rows.rows
    .filter((row) => String(row.status) === "open")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  const issue = async (rowId: string) => {
    setBusy(rowId);
    setSubmitted((ids) => [...ids, rowId]);
    setResult(await runAction(app, "issue_refund", rowId));
    setBusy(null);
    rows.reload();
    valueByStatus.reload();
    countByStatus.reload();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {result ? (
        <MessageBar intent={result.ok ? "success" : "error"}>
          <MessageBarBody>{result.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <Kpi label="Open refunds" value={String(openCount)} />
        <Kpi label="Open value" value={money(openValue)} />
        <Kpi label="Refunded to date" value={money(refunded)} />
      </div>

      <Card>
        <CardHeader header={<Subtitle2>Refund value by status</Subtitle2>} />
        <div style={{ height: 240, padding: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valueByStatus.groups}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" tickLine={false} />
              <YAxis tickFormatter={(v: number) => money(v)} width={80} tickLine={false} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="value" fill="#0f6f6a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader
          header={<Subtitle2>Largest open refunds</Subtitle2>}
          description={
            <Caption1>
              Over $500 goes to an approver before it pays out.
              {rows.capped ? ` Ranked within the first ${rows.rows.length} rows.` : ""}
            </Caption1>
          }
        />
        <div style={{ display: "grid", gap: 8, padding: 8 }}>
          {largest.length === 0 ? <Body1>Nothing open.</Body1> : null}
          {largest.map((row) => (
            <div
              key={row.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <Body1>
                {String(row.customer_name)} · {money(Number(row.amount))} · {String(row.reason)}
              </Body1>
              <Button
                appearance="primary"
                disabled={busy !== null || awaiting.has(row.id)}
                onClick={() => issue(row.id)}
              >
                {busy === row.id ? "Working…" : awaiting.has(row.id) ? "Submitted" : "Issue refund"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          header={<Subtitle2>All refund requests</Subtitle2>}
          description={
            rows.masked ? (
              <Badge appearance="tint" color="warning">
                Sensitive fields masked
              </Badge>
            ) : undefined
          }
        />
        <div style={{ overflowX: "auto" }}>
          <Table size="small" aria-label="All refund requests" style={{ minWidth: "max-content" }}>
            <TableHeader>
              <TableRow>
                {rows.columns.map((column) => (
                  <TableHeaderCell key={column}>{column.replace(/_/g, " ")}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.rows.map((row) => (
                <TableRow key={row.id}>
                  {rows.columns.map((column) => (
                    <TableCell
                      key={column}
                      style={{ overflow: "visible", whiteSpace: "nowrap", paddingRight: 16 }}
                    >
                      {String(row[column] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div style={{ padding: 4 }}>
        <Caption1>{label}</Caption1>
        <Title2 as="h2" block>
          {value}
        </Title2>
      </div>
    </Card>
  );
}
