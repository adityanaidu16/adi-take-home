import { prisma } from "@/kit/db";
import type { Action, DataSource, Row } from "./types";

function toRow(r: {
  id: string;
  key: string;
  description: string;
  environment: string;
  enabled: boolean;
}): Row {
  return {
    id: r.id,
    key: r.key,
    description: r.description,
    environment: r.environment,
    enabled: r.enabled,
  };
}

export const featureFlags: DataSource = {
  name: "feature_flags",
  origin: "postgres",
  fields: [
    { name: "key", type: "string" },
    { name: "description", type: "string" },
    { name: "environment", type: "string" },
    { name: "enabled", type: "boolean" },
  ],
  read: async () => {
    const rows = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return rows.map(toRow);
  },
  readOne: async (id) => {
    const row = await prisma.featureFlag.findUnique({ where: { id } });
    return row ? toRow(row) : null;
  },
};

export const toggleFlag: Action = {
  name: "toggle_flag",
  label: "Toggle",
  datasource: "feature_flags",
  risk: "low",
  execute: async ({ tx, row }) => {
    await tx.featureFlag.update({
      where: { id: String(row.id) },
      data: { enabled: !row.enabled },
    });
  },
};
