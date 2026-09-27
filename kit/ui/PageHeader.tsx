import {
  Badge,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Caption1,
  Title3,
} from "@fluentui/react-components";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  crumbs,
  title,
  subtitle,
  badges = [],
}: {
  crumbs: Crumb[];
  title: string;
  subtitle?: string;
  badges?: { text: string; tone: "brand" | "informative" | "warning" }[];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Breadcrumb size="small" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => (
          <BreadcrumbItem key={crumb.label}>
            <BreadcrumbButton href={crumb.href} current={i === crumbs.length - 1}>
              {crumb.label}
            </BreadcrumbButton>
            {i < crumbs.length - 1 && <BreadcrumbDivider />}
          </BreadcrumbItem>
        ))}
      </Breadcrumb>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        <Title3>{title}</Title3>
        {badges.map((badge) => (
          <Badge key={badge.text} appearance="tint" color={badge.tone}>
            {badge.text}
          </Badge>
        ))}
      </div>
      {subtitle && <Caption1>{subtitle}</Caption1>}
    </div>
  );
}
