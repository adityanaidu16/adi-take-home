"use client";

import { Button, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/apps/[slug]/actions";

export function ActionButton({
  label,
  risk,
  disabled,
  run,
  onResult,
}: {
  label: string;
  risk?: "low" | "high";
  disabled?: boolean;
  run: () => Promise<ActionResult>;
  /** Lets a parent keep the message visible when this row disappears. */
  onResult?: (result: ActionResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Button
        appearance={risk === "high" ? "primary" : "secondary"}
        size="small"
        disabled={pending || disabled}
        onClick={() =>
          startTransition(async () => {
            const outcome = await run();
            setResult(outcome);
            onResult?.(outcome);
          })
        }
      >
        {pending ? "Working…" : label}
      </Button>
      {result && !onResult && (
        <MessageBar intent={result.ok ? "success" : "error"}>
          <MessageBarBody>{result.message}</MessageBarBody>
        </MessageBar>
      )}
    </span>
  );
}
