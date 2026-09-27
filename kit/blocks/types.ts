import type { Prisma } from "@prisma/client";

export type FieldType = "string" | "number" | "boolean";

export type Field = {
  name: string;
  type: FieldType;
  /** Sensitive fields are masked server-side unless the app config grants the role. */
  sensitive?: boolean;
};

export type Row = Record<string, string | number | boolean | null>;

export type DataSource = {
  name: string;
  /** Where the data lives. Used by the UI and the docs, not for authorization. */
  origin: "postgres" | "sharepoint";
  fields: Field[];
  read: () => Promise<Row[]>;
  readOne: (id: string) => Promise<Row | null>;
};

/** Structured condition. No expressions, no eval. */
export type Condition =
  | { field: string; equals: string | number | boolean }
  | { field: string; gt: number };

export type ApprovalRule = {
  when?: Condition;
  approverRoles: string[];
};

export type ActionContext = {
  actor: string;
  app: string;
  row: Row;
  approvalRequestId: string;
  tx: Prisma.TransactionClient;
};

export type Action = {
  name: string;
  label: string;
  datasource: string;
  risk: "low" | "high";
  /**
   * Floor set in code. App config may add approval requirements on top of this
   * but can never remove it: at runtime approval is required if this rule fires
   * OR the config rule fires.
   */
  minApproval?: ApprovalRule;
  execute: (ctx: ActionContext) => Promise<void>;
};

export function conditionHolds(condition: Condition | undefined, row: Row): boolean {
  if (!condition) return true;
  const value = row[condition.field];
  if ("equals" in condition) return value === condition.equals;
  return typeof value === "number" && value > condition.gt;
}
