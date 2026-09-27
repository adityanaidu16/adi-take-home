import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { actions as registeredActions, dataSources } from "@/kit/blocks";
import { appConfigSchema, type AppConfig } from "./schema";

export const APPS_DIR = path.join(process.cwd(), "apps");

export type LoadedApp = { slug: string; config: AppConfig };

/** Parses and validates one app config against the registered building blocks. */
export function parseAppConfig(source: string, label: string): AppConfig {
  let raw: unknown;
  try {
    raw = YAML.parse(source);
  } catch (err) {
    throw new Error(`${label}: cannot parse YAML (${(err as Error).message})`);
  }

  const parsed = appConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`${label}: invalid config (${issues})`);
  }

  const config = parsed.data;
  const ds = dataSources[config.datasource];
  if (!ds) throw new Error(`${label}: unknown data source "${config.datasource}"`);

  const fieldNames = new Set(ds.fields.map((f) => f.name));
  for (const column of config.view.columns) {
    if (!fieldNames.has(column)) {
      throw new Error(`${label}: unknown field "${column}" on ${config.datasource}`);
    }
  }

  const summary = config.view.summary;
  if (summary) {
    // A summary is an aggregate of the data, so it gets the same treatment as
    // a column: the field must exist, and a sensitive field can never be
    // grouped or totalled — that would leak through the aggregate.
    const check = (name: string, where: string) => {
      const field = ds.fields.find((f) => f.name === name);
      if (!field) throw new Error(`${label}: unknown field "${name}" in ${where}`);
      if (!config.view.columns.includes(name)) {
        throw new Error(`${label}: "${name}" in ${where} is not one of view.columns`);
      }
      if (field.sensitive) {
        throw new Error(`${label}: "${name}" is sensitive and cannot be used in ${where}`);
      }
      return field;
    };
    check(summary.group_by, "view.summary.group_by");
    if (summary.measure) {
      const measure = check(summary.measure, "view.summary.measure");
      if (measure.type !== "number") {
        throw new Error(`${label}: view.summary.measure "${summary.measure}" is not a number`);
      }
    }
  }

  const roleNames = new Set(Object.keys(config.roles));
  const checkRoles = (roles: string[], where: string) => {
    for (const role of roles) {
      if (!roleNames.has(role)) throw new Error(`${label}: unknown role "${role}" in ${where}`);
    }
  };
  checkRoles(config.view.visible_to, "view.visible_to");
  checkRoles(config.view.show_sensitive_to, "view.show_sensitive_to");

  for (const entry of config.actions) {
    const action = registeredActions[entry.use];
    if (!action) throw new Error(`${label}: unknown action "${entry.use}"`);
    if (action.datasource !== config.datasource) {
      throw new Error(
        `${label}: action "${entry.use}" belongs to data source "${action.datasource}", not "${config.datasource}"`,
      );
    }
    checkRoles(entry.allowed_roles, `actions.${entry.use}.allowed_roles`);
    if (entry.approval) {
      checkRoles(entry.approval.approver_roles, `actions.${entry.use}.approval.approver_roles`);
      if (entry.approval.when && !fieldNames.has(entry.approval.when.field)) {
        throw new Error(
          `${label}: unknown field "${entry.approval.when.field}" in actions.${entry.use}.approval.when`,
        );
      }
    }
  }

  return config;
}

export function loadApp(slug: string): AppConfig {
  const file = path.join(APPS_DIR, `${slug}.yaml`);
  if (!fs.existsSync(file)) throw new Error(`Unknown app: ${slug}`);
  return parseAppConfig(fs.readFileSync(file, "utf8"), `apps/${slug}.yaml`);
}

export function loadApps(): LoadedApp[] {
  if (!fs.existsSync(APPS_DIR)) return [];
  return fs
    .readdirSync(APPS_DIR)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => {
      const slug = f.replace(/\.ya?ml$/, "");
      return { slug, config: loadApp(slug) };
    });
}
