"use client";

import {
  Badge,
  Caption1,
  Divider,
  makeStyles,
  shorthands,
  Text,
  tokens,
} from "@fluentui/react-components";
import { DocumentBulletListRegular } from "@fluentui/react-icons";

export type RequestItem = {
  id: string;
  app: string;
  action: string;
  status: string;
  createdAt: string;
  decidedBy: string | null;
  fields: { label: string; value: string }[];
};

const tone: Record<string, "warning" | "success" | "danger" | "informative"> = {
  pending: "warning",
  approved: "success",
  auto_approved: "success",
  cancelled: "danger",
};

const useStyles = makeStyles({
  surface: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow2,
  },
  item: { ...shorthands.padding("16px") },
  fields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    ...shorthands.gap("8px", "24px"),
    marginTop: "8px",
  },
  value: { wordBreak: "break-all" },
  empty: { ...shorthands.padding("32px"), textAlign: "center" },
});

export function RequestsList({ items }: { items: RequestItem[] }) {
  const styles = useStyles();

  return (
    <div className={styles.surface}>
      {items.length === 0 && (
        <div className={styles.empty}>
          <DocumentBulletListRegular fontSize={32} />
          <div>
            <Text>You have not raised any requests.</Text>
          </div>
        </div>
      )}

      {items.map((item, index) => (
        <div key={item.id}>
          {index > 0 && <Divider />}
          <div className={styles.item}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Text weight="semibold">{item.action.replace(/_/g, " ")}</Text>
              <Badge appearance="tint" color="brand">
                {item.app}
              </Badge>
              <Badge appearance="filled" color={tone[item.status] ?? "informative"}>
                {item.status === "pending" ? "waiting on an approver" : item.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <Caption1>
              Raised {item.createdAt}
              {item.decidedBy ? ` · decided by ${item.decidedBy}` : ""}
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
        </div>
      ))}
    </div>
  );
}
