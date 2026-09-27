import { Card, Link as FluentLink, Text } from "@fluentui/react-components";
import { getSession } from "@/kit/auth/session";
import { AppTable } from "@/kit/ui/AppTable";
import { AccessDenied, getAppView } from "@/kit/view";
import { runAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppPage({ params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) {
    return (
      <Text>
        <FluentLink href="/api/auth/login">Sign in</FluentLink> to view this app.
      </Text>
    );
  }

  let view;
  try {
    view = await getAppView(params.slug, session);
  } catch (err) {
    const denied = err instanceof AccessDenied;
    return (
      <Card>
        <Text as="h1" size={500} weight="semibold">
          {denied ? "No access" : "Cannot load app"}
        </Text>
        <Text>{(err as Error).message}</Text>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text as="h1" size={600} weight="semibold">
          {view.config.name}
        </Text>
        <Text size={200}>
          your roles: {view.roles.join(", ") || "none"} · source: {view.origin}
        </Text>
      </div>

      {view.isApprover && (
        <p>
          <FluentLink as="a" href="/approvals">
            Approvals queue
          </FluentLink>
        </p>
      )}

      <AppTable
        label={view.config.name}
        columns={view.columns}
        rows={view.rows.map((row) => ({
          id: String(row.id),
          cells: view.columns.map((c) => String(row[c])),
          actions: view.actions.map((action) => ({
            name: action.name,
            label: action.label,
            risk: action.risk,
            disabled: action.appliesTo ? !action.appliesTo(row) : false,
            run: runAction.bind(null, view.slug, action.name, String(row.id)),
          })),
        }))}
      />
      {view.rows.length === 0 && <Text>No records.</Text>}
    </div>
  );
}
