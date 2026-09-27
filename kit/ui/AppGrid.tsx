"use client";

import {
  Badge,
  Button,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  Field,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  shorthands,
  Subtitle2,
  TableCellLayout,
  Text,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  tokens,
  createTableColumn,
  type TableColumnDefinition,
} from "@fluentui/react-components";
import {
  ArrowClockwiseRegular,
  DismissRegular,
  DocumentTableRegular,
  FilterRegular,
} from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, ExportResult } from "@/app/apps/[slug]/actions";
import { ActionButton } from "./ActionButton";

export type GridAction = {
  name: string;
  label: string;
  risk: "low" | "high";
  disabled: boolean;
  run: () => Promise<ActionResult>;
};

export type GridRow = {
  id: string;
  cells: Record<string, string>;
  actions: GridAction[];
  /** Set when a request against this record is already waiting on an approver. */
  pendingBy?: string;
};

export type GridSummary = {
  label: string;
  measure: string | null;
  groups: { key: string; value: number }[];
};

const useStyles = makeStyles({
  surface: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow2,
    overflowX: "hidden",
  },
  toolbar: { ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2) },
  scroll: { overflowX: "auto" },
  grid: { minWidth: "100%" },
  row: { cursor: "pointer" },
  empty: { ...shorthands.padding("24px") },
  notice: { marginBottom: "12px" },
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    ...shorthands.gap("12px"),
    marginBottom: "12px",
  },
  tile: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding("12px"),
    boxShadow: tokens.shadow2,
  },
  bar: {
    height: "6px",
    backgroundColor: tokens.colorBrandBackground,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    marginTop: "6px",
  },
  detailField: { marginBottom: "12px" },
  detailValue: { wordBreak: "break-all" },
  drawerActions: { display: "flex", flexWrap: "wrap", ...shorthands.gap("8px"), marginTop: "16px" },
});

function compareCells(a: string, b: string) {
  const [na, nb] = [Number(a), Number(b)];
  if (a !== "" && b !== "" && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return (a ?? "").localeCompare(b ?? "");
}

export function AppGrid({
  columns,
  rows,
  sensitiveColumns,
  masked,
  summary,
  exportCsv,
}: {
  columns: string[];
  rows: GridRow[];
  sensitiveColumns: string[];
  masked: boolean;
  summary?: GridSummary | null;
  exportCsv?: () => Promise<ExportResult>;
}) {
  const styles = useStyles();
  const router = useRouter();
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [exporting, setExporting] = useState(false);

  async function download() {
    if (!exportCsv) return;
    setExporting(true);
    try {
      const result = await exportCsv();
      setNotice({ ok: result.ok, message: result.message });
      if (result.ok && result.csv) {
        const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename ?? "export.csv";
        link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const sensitive = new Set(sensitiveColumns);

  const definitions: TableColumnDefinition<GridRow>[] = columns.map((column) =>
    createTableColumn<GridRow>({
      columnId: column,
      compare: (a, b) => compareCells(a.cells[column] ?? "", b.cells[column] ?? ""),
      renderHeaderCell: () => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {column.replace(/_/g, " ")}
          {sensitive.has(column) && (
            <Badge appearance="tint" color={masked ? "informative" : "danger"} size="small">
              {masked ? "masked" : "sensitive"}
            </Badge>
          )}
        </span>
      ),
      renderCell: (row) => <TableCellLayout truncate>{row.cells[column]}</TableCellLayout>,
    }),
  );

  definitions.push(
    createTableColumn<GridRow>({
      columnId: "__actions",
      renderHeaderCell: () => "",
      renderCell: (row) => (
        <TableCellLayout>
          <span
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            {row.pendingBy && (
              <Badge appearance="tint" color="warning">
                Awaiting approval
              </Badge>
            )}
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
        </TableCellLayout>
      ),
    }),
  );

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        {summary && summary.groups.length > 0 && (
          <div className={styles.summary}>
            {summary.groups.map((group) => {
              const largest = Math.max(...summary.groups.map((g) => g.value), 1);
              return (
                <div key={group.key} className={styles.tile}>
                  <Caption1>{group.key.replace(/_/g, " ")}</Caption1>
                  <div>
                    <Subtitle2>{group.value.toLocaleString()}</Subtitle2>
                  </div>
                  <div
                    className={styles.bar}
                    style={{ width: `${Math.round((group.value / largest) * 100)}%` }}
                  />
                  <Caption1>{summary.label}</Caption1>
                </div>
              );
            })}
          </div>
        )}

        {notice && (
          <MessageBar
            className={styles.notice}
            intent={notice.ok ? "success" : "error"}
            politeness="assertive"
          >
            <MessageBarBody>
              <MessageBarTitle>{notice.ok ? "Done" : "Not done"}</MessageBarTitle>
              {notice.message}
            </MessageBarBody>
          </MessageBar>
        )}

        <div className={styles.surface}>
          <Toolbar className={styles.toolbar} size="small">
            <ToolbarButton
              icon={<ArrowClockwiseRegular />}
              disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton icon={<FilterRegular />} disabled>
              Filter
            </ToolbarButton>
            <ToolbarButton
              icon={<DocumentTableRegular />}
              disabled={!exportCsv || exporting}
              onClick={download}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </ToolbarButton>
          </Toolbar>

          <div className={styles.scroll}>
            <DataGrid
              className={styles.grid}
              items={rows}
              columns={definitions}
              sortable
              getRowId={(row) => row.id}
              focusMode="composite"
              size="small"
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<GridRow>>
                {({ item, rowId }) => (
                  <DataGridRow<GridRow>
                    key={rowId}
                    className={styles.row}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>

          {rows.length === 0 && (
            <div className={styles.empty}>
              <Text>No records.</Text>
            </div>
          )}
        </div>
        <Caption1>
          {rows.length} {rows.length === 1 ? "row" : "rows"} · select a row to see details
        </Caption1>
      </div>

      <Drawer
        type="overlay"
        separator
        open={selected !== null}
        position="end"
        onOpenChange={(_, data) => {
          if (!data.open) setSelectedId(null);
        }}
        style={{ width: 380 }}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                aria-label="Close details"
                onClick={() => setSelectedId(null)}
              />
            }
          >
            <Subtitle2>Details</Subtitle2>
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {selected &&
            columns.map((column) => (
              <Field
                key={column}
                className={styles.detailField}
                label={column.replace(/_/g, " ")}
                size="small"
              >
                <Text className={styles.detailValue}>{selected.cells[column]}</Text>
              </Field>
            ))}
          {selected && selected.actions.length > 0 && (
            <div className={styles.drawerActions}>
              {selected.actions.map((action) => (
                <ActionButton
                  key={action.name}
                  label={action.label}
                  risk={action.risk}
                  disabled={action.disabled}
                  run={action.run}
                  onResult={setNotice}
                />
              ))}
            </div>
          )}
        </DrawerBody>
      </Drawer>
    </div>
  );
}
