import { getAction, getDataSource, type Row } from "@/kit/blocks";
import { canSeeSensitive, canView, rolesFor } from "@/kit/auth/roles";
import type { Session } from "@/kit/auth/session";
import { audit } from "@/kit/audit/log";
import { loadApp, resolvedColumns } from "@/kit/config/loader";
import type { AppConfig } from "@/kit/config/schema";

export class AccessDenied extends Error {}

/** Hard ceiling on rows handed to a dashboard, so presentation cannot bulk-read. */
export const ROW_LIMIT = 1000;

export function mask(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  return text.length <= 4 ? "••••" : `•••• ${text.slice(-4)}`;
}

export type AppView = {
  slug: string;
  config: AppConfig;
  roles: string[];
  columns: string[];
  rows: Row[];
  /** Actions this user is allowed to run, as declared in config. */
  actions: {
    name: string;
    label: string;
    risk: "low" | "high";
    appliesTo?: (row: Row) => boolean;
  }[];
  isApprover: boolean;
  origin: "postgres" | "sharepoint";
  /** Columns the data source declares sensitive, so the grid can label them. */
  sensitiveColumns: string[];
  /** False when this user only sees the masked form of those columns. */
  showsSensitive: boolean;
  /** Optional declarative dashboard strip, computed from the same rows. */
  summary: SummaryView | null;
};

export type SummaryView = {
  label: string;
  measure: string | null;
  groups: { key: string; value: number }[];
};

function summarise(config: AppConfig, rows: Row[]): SummaryView | null {
  const spec = config.view.summary;
  if (!spec) return null;

  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[spec.group_by] ?? "");
    const amount = spec.measure ? Number(row[spec.measure]) : 1;
    totals.set(key, (totals.get(key) ?? 0) + (Number.isFinite(amount) ? amount : 0));
  }

  return {
    label: spec.label ?? (spec.measure ? `${spec.measure} by ${spec.group_by}` : `by ${spec.group_by}`),
    measure: spec.measure ?? null,
    groups: Array.from(totals, ([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value),
  };
}

/**
 * The single read path. Authorization and masking happen here, on the server,
 * before any data reaches a page. Pages never touch data sources directly.
 */
export async function getAppView(slug: string, session: Session): Promise<AppView> {
  const config = loadApp(slug);
  const roles = rolesFor(config, session);
  if (!canView(config, roles)) throw new AccessDenied(`No access to ${slug}`);

  const ds = getDataSource(config.datasource);
  const sensitive = new Set(ds.fields.filter((f) => f.sensitive).map((f) => f.name));
  const showSensitive = canSeeSensitive(config, roles);

  const columns = resolvedColumns(config);
  const rows = (await ds.read()).map((row) => {
    const out: Row = { id: row.id };
    for (const column of columns) {
      out[column] = sensitive.has(column) && !showSensitive ? mask(row[column]) : row[column];
    }
    return out;
  });

  const actions = config.actions
    .filter((entry) => entry.allowed_roles.some((r) => roles.includes(r)))
    .map((entry) => {
      const action = getAction(entry.use);
      return {
        name: action.name,
        label: action.label,
        risk: action.risk,
        appliesTo: action.appliesTo,
      };
    });

  const isApprover = config.actions.some((entry) =>
    approverRolesFor(config, entry.use).some((r) => roles.includes(r)),
  );

  return {
    slug,
    config,
    roles,
    columns,
    rows,
    actions,
    isApprover,
    origin: ds.origin,
    sensitiveColumns: columns.filter((c) => sensitive.has(c)),
    showsSensitive: showSensitive,
    summary: summarise(config, rows),
  };
}

export type AppRowsPayload = {
  columns: string[];
  rows: Row[];
  total: number;
  capped: boolean;
  masked: boolean;
  sensitiveColumns: string[];
};

/**
 * What `useAppRows` receives: the same authorized, masked view the grid gets,
 * capped so presentation cannot turn into a bulk export.
 */
export async function getAppRows(slug: string, session: Session): Promise<AppRowsPayload> {
  const view = await getAppView(slug, session);
  return {
    columns: view.columns,
    rows: view.rows.slice(0, ROW_LIMIT),
    total: view.rows.length,
    capped: view.rows.length > ROW_LIMIT,
    masked: !view.showsSensitive,
    sensitiveColumns: view.sensitiveColumns,
  };
}

export type AggregateSpec = { groupBy: string; measure?: string };
export type AggregateResult = {
  groupBy: string;
  measure: string | null;
  groups: { key: string; value: number }[];
};

/**
 * Aggregates for dashboards, computed here rather than in the browser so the
 * raw rows never have to leave the server. A sensitive field can be neither
 * the grouping nor the measure: an aggregate over it leaks it just as surely
 * as a column would.
 */
export async function getAppAggregate(
  slug: string,
  session: Session,
  spec: AggregateSpec,
): Promise<AggregateResult> {
  const config = loadApp(slug);
  const roles = rolesFor(config, session);
  if (!canView(config, roles)) throw new AccessDenied(`No access to ${slug}`);

  const ds = getDataSource(config.datasource);
  const field = (name: string, where: string) => {
    const found = ds.fields.find((f) => f.name === name);
    if (!found) throw new AccessDenied(`Unknown field "${name}" in ${where}`);
    if (found.sensitive) {
      throw new AccessDenied(`"${name}" is sensitive and cannot be aggregated`);
    }
    return found;
  };

  field(spec.groupBy, "groupBy");
  if (spec.measure) {
    const measure = field(spec.measure, "measure");
    if (measure.type !== "number") throw new AccessDenied(`"${spec.measure}" is not a number`);
  }

  const totals = new Map<string, number>();
  for (const row of await ds.read()) {
    const key = String(row[spec.groupBy] ?? "");
    const amount = spec.measure ? Number(row[spec.measure]) : 1;
    totals.set(key, (totals.get(key) ?? 0) + (Number.isFinite(amount) ? amount : 0));
  }

  return {
    groupBy: spec.groupBy,
    measure: spec.measure ?? null,
    groups: Array.from(totals, ([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value),
  };
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Export goes through the same authorized, masked view as the screen, so an
 * export can never contain more than the user can already read — and it is
 * audited, because a spreadsheet leaving the building is the event you most
 * want a record of.
 */
export async function exportAppCsv(slug: string, session: Session): Promise<string> {
  const view = await getAppView(slug, session);
  const lines = [view.columns.map(csvCell).join(",")];
  for (const row of view.rows) {
    lines.push(view.columns.map((c) => csvCell(String(row[c] ?? ""))).join(","));
  }
  await audit({
    actor: session.username,
    app: slug,
    action: "view.exported",
    detail: { rows: view.rows.length, columns: view.columns, sensitiveMasked: !view.showsSensitive },
  });
  return lines.join("\n");
}

/** Union of the code-level minimum approvers and any approvers added by config. */
export function approverRolesFor(config: AppConfig, actionName: string): string[] {
  const action = getAction(actionName);
  const entry = config.actions.find((a) => a.use === actionName);
  return Array.from(
    new Set([...(action.minApproval?.approverRoles ?? []), ...(entry?.approval?.approver_roles ?? [])]),
  );
}
