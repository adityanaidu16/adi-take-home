"use client";

import {
  Badge,
  Button,
  Caption1,
  Divider,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  shorthands,
  Text,
  Toolbar,
  ToolbarButton,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowClockwiseRegular,
  CheckmarkCircleRegular,
  PersonLockRegular,
} from "@fluentui/react-icons";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/apps/[slug]/actions";
import { ActionButton } from "./ActionButton";

export type ApprovalItem = {
  id: string;
  app: string;
  action: string;
  fields: { label: string; value: string }[];
  requestedBy: string;
  createdAt: string;
  ownRequest: boolean;
};

const useStyles = makeStyles({
  surface: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow2,
  },
  toolbar: { ...shorthands.borderBottom("1px", "solid", tokens.colorNeutralStroke2) },
  item: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    ...shorthands.gap("16px"),
    ...shorthands.padding("16px"),
  },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    ...shorthands.gap("8px", "24px"),
    marginTop: "8px",
  },
  value: { wordBreak: "break-all" },
  empty: { ...shorthands.padding("32px"), textAlign: "center" },
  notice: { marginBottom: "12px" },
});

/**
 * The notice lives above the list, not inside a row: approving can remove the
 * row it was raised from — a stale request is cancelled and disappears — and
 * the approver still needs to read what happened.
 */
export function ApprovalsList({
  items,
  approve,
}: {
  items: ApprovalItem[];
  approve: (requestId: string) => Promise<ActionResult>;
}) {
  const styles = useStyles();
  const router = useRouter();
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [refreshing, startRefresh] = useTransition();

  return (
    <div>
      {notice && (
        <MessageBar
          className={styles.notice}
          intent={notice.ok ? "success" : "warning"}
          politeness="assertive"
        >
          <MessageBarBody>
            <MessageBarTitle>{notice.ok ? "Approved" : "Not approved"}</MessageBarTitle>
            {notice.message}
          </MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.surface}>
        <Toolbar className={styles.toolbar} size="small">
          <ToolbarButton
            icon={<ArrowClockwiseRegular />}
            disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </ToolbarButton>
        </Toolbar>

        {items.length === 0 && (
          <div className={styles.empty}>
            <CheckmarkCircleRegular fontSize={32} />
            <div>
              <Text>Nothing waiting for your approval.</Text>
            </div>
          </div>
        )}

        {items.map((item, index) => (
          <div key={item.id}>
            {index > 0 && <Divider />}
            <div className={styles.item}>
              <div style={{ minWidth: 0, flexGrow: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Text weight="semibold">{item.action.replace(/_/g, " ")}</Text>
                  <Badge appearance="tint" color="brand">
                    {item.app}
                  </Badge>
                </div>
                <Caption1>
                  Requested by {item.requestedBy} · {item.createdAt}
                </Caption1>
                <div className={styles.fields}>
                  {item.fields.map((field) => (
                    <div key={field.label}>
                      <Caption1>{field.label.replace(/_/g, " ")}</Caption1>
                      <div>
                        <Text className={styles.value}>{field.value}</Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {item.ownRequest ? (
                  <Button icon={<PersonLockRegular />} disabled>
                    Your request
                  </Button>
                ) : (
                  <ActionButton
                    label="Approve"
                    risk="high"
                    run={approve.bind(null, item.id)}
                    onResult={setNotice}
                  />
                )}
              </div>
            </div>
            {item.ownRequest && (
              <div style={{ padding: "0 16px 16px" }}>
                <Caption1>Maker-checker: you cannot approve your own request.</Caption1>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
