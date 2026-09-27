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
import type { ActionResult } from "@/app/apps/[slug]/actions";
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
  detailField: { marginBottom: "12px" },
  detailValue: { wordBreak: "break-all" },
  drawerActions: { display: "flex", flexWrap: "wrap", ...shorthands.gap("8px"), marginTop: "16px" },
});

export function AppGrid({
  columns,
  rows,
  sensitiveColumns,
  masked,
}: {
  columns: string[];
  rows: GridRow[];
  sensitiveColumns: string[];
  masked: boolean;
}) {
  const styles = useStyles();
  const router = useRouter();
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const sensitive = new Set(sensitiveColumns);

  const definitions: TableColumnDefinition<GridRow>[] = columns.map((column) =>
    createTableColumn<GridRow>({
      columnId: column,
      compare: (a, b) => (a.cells[column] ?? "").localeCompare(b.cells[column] ?? ""),
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
            style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
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
            <ToolbarButton icon={<DocumentTableRegular />} disabled>
              Export to Excel
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

      <Drawer type="inline" separator open={selected !== null} position="end" style={{ width: 340 }}>
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
