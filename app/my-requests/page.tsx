import { requestsRaisedBy } from "@/kit/approvals/engine";
import { getDataSource, type Row } from "@/kit/blocks";
import { canSeeSensitive, rolesFor } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApp, resolvedColumns } from "@/kit/config/loader";
import { PageHeader } from "@/kit/ui/PageHeader";
import { RequestsList, type RequestItem } from "@/kit/ui/RequestsList";
import { SignInPrompt } from "@/kit/ui/SignInPrompt";
import { mask } from "@/kit/view";

export const dynamic = "force-dynamic";

export default async function MyRequestsPage() {
  const session = await getSession();
  if (!session) return <SignInPrompt what="the requests you have raised" />;

  const requests = await requestsRaisedBy(session);

  const items: RequestItem[] = requests.map((request) => {
    const config = loadApp(request.app);
    const ds = getDataSource(config.datasource);
    // Masked with the requester's own roles: raising a request never reveals
    // more of a record than the app already shows them.
    const showSensitive = canSeeSensitive(config, rolesFor(config, session));
    const payload = request.payload as Row;

    return {
      id: request.id,
      app: config.name,
      action: request.action,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
      decidedBy: request.decidedBy,
      fields: resolvedColumns(config).map((column) => {
        const field = ds.fields.find((f) => f.name === column);
        const value = field?.sensitive && !showSensitive ? mask(payload[column]) : payload[column];
        return { label: column, value: String(value) };
      }),
    };
  });

  const pending = items.filter((item) => item.status === "pending").length;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "My requests" }]}
        title="My requests"
        subtitle="Everything you have asked for, and where it got to. You cannot approve your own."
        badges={pending > 0 ? [{ text: `${pending} waiting on an approver`, tone: "warning" }] : []}
      />
      <RequestsList items={items} />
    </>
  );
}
