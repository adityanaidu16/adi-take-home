"use client";

/**
 * The only way an app dashboard gets data or does anything. Every function
 * here goes back to the server, where authorization, masking, approvals and
 * audit already live; a dashboard is presentation and nothing else.
 *
 * `apps/**` is lint-sandboxed to this module (plus React and Fluent), so a
 * dashboard cannot call `fetch`, reach Prisma, or declare a server action.
 */

import { useCallback, useEffect, useState } from "react";
import { runAppAction, type ActionResult } from "@/app/apps/[slug]/actions";

export type Cell = string | number | boolean | null;
export type AppRow = { id: string } & Record<string, Cell>;

export type RowsResult = {
  rows: AppRow[];
  columns: string[];
  /** Columns the data source declares sensitive; masked unless you may see them. */
  sensitiveColumns: string[];
  masked: boolean;
  /** True when the app has more rows than the server hands to a dashboard. */
  capped: boolean;
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export type AggregateSpec = { groupBy: string; measure?: string };
export type AggregateGroup = { key: string; value: number };
export type AggregateResult = {
  groups: AggregateGroup[];
  measure: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

async function getJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.error ?? response.statusText));
  return body;
}

function useJson<T>(url: string, read: (body: Record<string, unknown>) => T, empty: T) {
  const [state, setState] = useState<{ data: T; loading: boolean; error: string | null }>({
    data: empty,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    getJson(url)
      .then((body) => live && setState({ data: read(body), loading: false, error: null }))
      .catch((err: Error) => live && setState({ data: empty, loading: false, error: err.message }));
    return () => {
      live = false;
    };
    // `read` and `empty` are literals at the call sites below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce]);

  return { ...state, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

/** Rows for `app`, already authorized and masked on the server, capped at 1,000. */
export function useAppRows(app: string): RowsResult {
  const { data, loading, error, reload } = useJson(
    `/api/apps/${encodeURIComponent(app)}/rows`,
    (body) => ({
      rows: (body.rows ?? []) as AppRow[],
      columns: (body.columns ?? []) as string[],
      sensitiveColumns: (body.sensitiveColumns ?? []) as string[],
      masked: Boolean(body.masked),
      capped: Boolean(body.capped),
      total: Number(body.total ?? 0),
    }),
    { rows: [], columns: [], sensitiveColumns: [], masked: false, capped: false, total: 0 },
  );
  return { ...data, loading, error, reload };
}

/** A grouped total, computed on the server. Sensitive fields are refused. */
export function useAppAggregate(app: string, spec: AggregateSpec): AggregateResult {
  const query = new URLSearchParams({ groupBy: spec.groupBy });
  if (spec.measure) query.set("measure", spec.measure);
  const { data, loading, error, reload } = useJson(
    `/api/apps/${encodeURIComponent(app)}/aggregate?${query.toString()}`,
    (body) => ({
      groups: (body.groups ?? []) as AggregateGroup[],
      measure: (body.measure ?? null) as string | null,
    }),
    { groups: [] as AggregateGroup[], measure: null as string | null },
  );
  return { ...data, loading, error, reload };
}

/**
 * Runs a configured action against one record. This is the same server path
 * the generic grid uses, so maker-checker and audit are unchanged.
 */
export async function runAction(
  app: string,
  action: string,
  rowId: string,
): Promise<ActionResult> {
  return runAppAction(app, action, rowId);
}

export type { ActionResult };
