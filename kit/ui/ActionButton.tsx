"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/apps/[slug]/actions";

export function ActionButton({
  label,
  risk,
  disabled,
  run,
}: {
  label: string;
  risk?: "low" | "high";
  disabled?: boolean;
  run: () => Promise<ActionResult>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            setResult(await run());
          })
        }
        className={`rounded px-2 py-1 text-xs text-white disabled:opacity-50 ${
          risk === "high" ? "bg-rose-700" : "bg-slate-800"
        }`}
      >
        {pending ? "Working…" : label}
      </button>
      {result && (
        <span className={`text-xs ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {result.message}
        </span>
      )}
    </span>
  );
}
