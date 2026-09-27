import type { Action, DataSource, Row } from "../types";
import { listItems, patchItemFields } from "./client";
import { refundExceptionsList, type RegisteredList } from "./lists";

function itemToRow(list: RegisteredList, item: { id: string; fields: Record<string, unknown> }): Row {
  const row: Row = { id: item.id };
  for (const field of list.fields) {
    const raw = item.fields[list.fieldMap[field.name]];
    row[field.name] =
      raw === undefined || raw === null
        ? null
        : field.type === "number"
          ? Number(raw)
          : field.type === "boolean"
            ? Boolean(raw)
            : String(raw);
  }
  return row;
}

export function sharePointDataSource(list: RegisteredList): DataSource {
  return {
    name: list.name,
    origin: "sharepoint",
    fields: list.fields,
    read: async () => (await listItems(list.siteId, list.listId)).map((i) => itemToRow(list, i)),
    readOne: async (id) => {
      const items = await listItems(list.siteId, list.listId);
      const item = items.find((i) => i.id === id);
      return item ? itemToRow(list, item) : null;
    },
  };
}

export const refundExceptions = sharePointDataSource(refundExceptionsList);

export const updateExceptionStatus: Action = {
  name: "update_exception_status",
  label: "Mark resolved",
  datasource: "refund_exceptions",
  risk: "low",
  execute: async ({ row }) => {
    await patchItemFields(
      refundExceptionsList.siteId,
      refundExceptionsList.listId,
      String(row.id),
      { [refundExceptionsList.fieldMap.status]: "Resolved" },
    );
  },
};
