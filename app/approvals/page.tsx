import { approveRequest } from "@/app/apps/[slug]/actions";
import { pendingRequestsFor } from "@/kit/approvals/engine";
import { getDataSource, type Row } from "@/kit/blocks";
import { canSeeSensitive, rolesFor } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApp, resolvedColumns } from "@/kit/config/loader";
import { ApprovalsList, type ApprovalItem } from "@/kit/ui/ApprovalsList";
import { PageHeader } from "@/kit/ui/PageHeader";
import { SignInPrompt } from "@/kit/ui/SignInPrompt";
import { mask } from "@/kit/view";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) return <SignInPrompt what="requests waiting for your approval" />;

  const requests = await pendingRequestsFor(session);

  const items: ApprovalItem[] = requests.map((request) => {
    const config = loadApp(request.app);
    const ds = getDataSource(config.datasource);
    const showSensitive = canSeeSensitive(config, rolesFor(config, session));
    const payload = request.payload as Row;
    const fields = resolvedColumns(config).map((column) => {
      const field = ds.fields.find((f) => f.name === column);
      const value = field?.sensitive && !showSensitive ? mask(payload[column]) : payload[column];
      return { label: column, value: String(value) };
    });

    return {
      id: request.id,
      app: request.app,
      action: request.action,
      fields,
      requestedBy: request.requestedBy,
      createdAt: request.createdAt.toISOString(),
      ownRequest: request.requestedBy === session.username,
    };
  });

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Approvals" }]}
        title="Approvals"
        subtitle="Requests waiting on you. The requester can never approve their own."
        badges={items.length > 0 ? [{ text: `${items.length} pending`, tone: "brand" }] : []}
      />
      <ApprovalsList items={items} approve={approveRequest} />
    </>
  );
}
