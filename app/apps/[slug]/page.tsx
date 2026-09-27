import { MessageBar, MessageBarBody, MessageBarTitle } from "@fluentui/react-components";
import { getSession } from "@/kit/auth/session";
import { AppGrid, type GridRow } from "@/kit/ui/AppGrid";
import { PageHeader } from "@/kit/ui/PageHeader";
import { SignInPrompt } from "@/kit/ui/SignInPrompt";
import { AccessDenied, getAppView } from "@/kit/view";
import { runAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppPage({ params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return <SignInPrompt what="this app" />;

  let view;
  try {
    view = await getAppView(params.slug, session);
  } catch (err) {
    const denied = err instanceof AccessDenied;
    return (
      <>
        <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: params.slug }]} title={params.slug} />
        <MessageBar intent={denied ? "warning" : "error"}>
          <MessageBarBody>
            <MessageBarTitle>{denied ? "No access" : "Cannot load app"}</MessageBarTitle>
            {(err as Error).message}
          </MessageBarBody>
        </MessageBar>
      </>
    );
  }

  const rows: GridRow[] = view.rows.map((row) => ({
    id: String(row.id),
    cells: Object.fromEntries(view.columns.map((c) => [c, String(row[c])])),
    actions: view.actions.map((action) => ({
      name: action.name,
      label: action.label,
      risk: action.risk,
      disabled: action.appliesTo ? !action.appliesTo(row) : false,
      run: runAction.bind(null, view.slug, action.name, String(row.id)),
    })),
  }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: view.config.name }]}
        title={view.config.name}
        subtitle={`Owner: ${view.config.owner} · Your roles: ${view.roles.join(", ") || "none"}`}
        badges={[
          { text: view.origin === "sharepoint" ? "SharePoint list" : "Postgres", tone: "informative" },
          ...(view.showsSensitive
            ? []
            : [{ text: "Sensitive fields masked", tone: "warning" as const }]),
        ]}
      />
      <AppGrid
        columns={view.columns}
        rows={rows}
        sensitiveColumns={view.sensitiveColumns}
        masked={!view.showsSensitive}
      />
    </>
  );
}
