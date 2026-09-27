"use client";

import {
  Badge,
  makeStyles,
  shorthands,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from "@fluentui/react-components";
import { useState } from "react";

export type LogRow = { id: string; cells: string[] };

const useStyles = makeStyles({
  surface: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow2,
    overflowX: "auto",
    marginTop: "8px",
  },
  cell: { whiteSpace: "nowrap" },
});

function LogTable({ columns, rows }: { columns: string[]; rows: LogRow[] }) {
  const styles = useStyles();
  return (
    <div className={styles.surface}>
      <Table as="table" size="small">
        <TableHeader as="thead">
          <TableRow as="tr">
            {columns.map((c) => (
              <TableHeaderCell as="th" key={c}>
                {c}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody as="tbody">
          {rows.map((row) => (
            <TableRow as="tr" key={row.id}>
              {row.cells.map((value, i) => (
                <TableCell as="td" className={styles.cell} key={columns[i]}>
                  {value}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <div style={{ padding: 24 }}>
          <Text>Nothing recorded yet.</Text>
        </div>
      )}
    </div>
  );
}

export function LogTabs({
  audit,
  ledger,
}: {
  audit: { columns: string[]; rows: LogRow[] };
  ledger: { columns: string[]; rows: LogRow[] };
}) {
  const [tab, setTab] = useState<"audit" | "ledger">("audit");

  return (
    <div>
      <TabList selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as typeof tab)}>
        <Tab value="audit">
          Audit trail <Badge appearance="tint">{audit.rows.length}</Badge>
        </Tab>
        <Tab value="ledger">
          Payment ledger <Badge appearance="tint">{ledger.rows.length}</Badge>
        </Tab>
      </TabList>
      {tab === "audit" ? (
        <LogTable columns={audit.columns} rows={audit.rows} />
      ) : (
        <LogTable columns={ledger.columns} rows={ledger.rows} />
      )}
    </div>
  );
}
