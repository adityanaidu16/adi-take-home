import { getAction, getDataSource, type Row } from "@/kit/blocks";
import { canSeeSensitive, canView, rolesFor } from "@/kit/auth/roles";
import type { Session } from "@/kit/auth/session";
import { loadApp } from "@/kit/config/loader";
import type { AppConfig } from "@/kit/config/schema";

export class AccessDenied extends Error {}

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
};

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

  const rows = (await ds.read()).map((row) => {
    const out: Row = { id: row.id };
    for (const column of config.view.columns) {
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
    columns: config.view.columns,
    rows,
    actions,
    isApprover,
    origin: ds.origin,
  };
}

/** Union of the code-level minimum approvers and any approvers added by config. */
export function approverRolesFor(config: AppConfig, actionName: string): string[] {
  const action = getAction(actionName);
  const entry = config.actions.find((a) => a.use === actionName);
  return Array.from(
    new Set([...(action.minApproval?.approverRoles ?? []), ...(entry?.approval?.approver_roles ?? [])]),
  );
}
