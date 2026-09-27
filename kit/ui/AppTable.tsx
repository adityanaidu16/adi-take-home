"use client";

import {
  Card,
  MessageBar,
  MessageBarBody,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@fluentui/react-components";
import { useState } from "react";
import type { ActionResult } from "@/app/apps/[slug]/actions";
import { ActionButton } from "./ActionButton";

export type TableAction = {
  name: string;
  label: string;
  risk: "low" | "high";
  disabled: boolean;
  run: () => Promise<ActionResult>;
};

export type TableRowView = {
  id: string;
  cells: string[];
  actions: TableAction[];
};

export function AppTable({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: string[];
  rows: TableRowView[];
}) {
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const hasActions = rows.some((row) => row.actions.length > 0);

  return (
    <div>
      {notice && (
        <MessageBar intent={notice.ok ? "success" : "error"} style={{ marginTop: 16 }}>
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      )}

      <Card style={{ marginTop: 16, padding: 0, overflowX: "auto" }}>
        <Table as="table" size="small" aria-label={label} style={{ minWidth: "100%" }}>
          <TableHeader as="thead">
            <TableRow as="tr">
              {columns.map((c) => (
                <TableHeaderCell as="th" key={c}>
                  {c}
                </TableHeaderCell>
              ))}
              {hasActions && <TableHeaderCell as="th" />}
            </TableRow>
          </TableHeader>
          <TableBody as="tbody">
            {rows.map((row) => (
              <TableRow as="tr" key={row.id}>
                {row.cells.map((value, i) => (
                  <TableCell as="td" key={columns[i]} style={{ whiteSpace: "nowrap" }}>
                    {value}
                  </TableCell>
                ))}
                {hasActions && (
                  <TableCell as="td">
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {row.actions.map((action) => (
                        <ActionButton
                          key={action.name}
                          label={action.label}
                          risk={action.risk}
                          disabled={action.disabled}
                          run={action.run}
                          onResult={setNotice}
                        />
                      ))}
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
