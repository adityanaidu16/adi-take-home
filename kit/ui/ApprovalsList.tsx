"use client";

import { Card, MessageBar, MessageBarBody, Text } from "@fluentui/react-components";
import { useState } from "react";
import type { ActionResult } from "@/app/apps/[slug]/actions";
import { ActionButton } from "./ActionButton";

export type ApprovalItem = {
  id: string;
  app: string;
  action: string;
  summary: string;
  requestedBy: string;
  createdAt: string;
  ownRequest: boolean;
};

/**
 * The notice lives above the list, not inside a card: approving can remove the
 * card it was raised from — a stale request is cancelled and disappears — and
 * the approver still needs to read what happened.
 */
export function ApprovalsList({
  items,
  approve,
}: {
  items: ApprovalItem[];
  approve: (requestId: string) => Promise<ActionResult>;
}) {
  const [notice, setNotice] = useState<ActionResult | null>(null);

  return (
    <div>
      {notice && (
        <MessageBar intent={notice.ok ? "success" : "warning"} style={{ marginTop: 16 }}>
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      )}

      {items.length === 0 && <Text>Nothing waiting for your approval.</Text>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {items.map((item) => (
          <Card key={item.id}>
            <Text weight="semibold">
              {item.action} · {item.app}
            </Text>
            <Text>{item.summary}</Text>
            <Text size={200}>
              requested by {item.requestedBy} · {item.createdAt}
            </Text>
            {item.ownRequest ? (
              <Text size={200}>Maker-checker: you cannot approve your own request.</Text>
            ) : (
              <ActionButton
                label="Approve"
                run={approve.bind(null, item.id)}
                onResult={setNotice}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
