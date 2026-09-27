import { Link as FluentLink, Text } from "@fluentui/react-components";
import { approveRequest } from "@/app/apps/[slug]/actions";
import { pendingRequestsFor } from "@/kit/approvals/engine";
import { getDataSource, type Row } from "@/kit/blocks";
import { canSeeSensitive, rolesFor } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApp } from "@/kit/config/loader";
import { ApprovalsList, type ApprovalItem } from "@/kit/ui/ApprovalsList";
import { mask } from "@/kit/view";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <Text>
        <FluentLink href="/api/auth/login">Sign in</FluentLink> to view approvals.
      </Text>
    );
  }

  const requests = await pendingRequestsFor(session);

  const items: ApprovalItem[] = requests.map((request) => {
    const config = loadApp(request.app);
    const ds = getDataSource(config.datasource);
    const showSensitive = canSeeSensitive(config, rolesFor(config, session));
    const payload = request.payload as Row;
    const summary = config.view.columns
      .map((column) => {
        const field = ds.fields.find((f) => f.name === column);
        const value = field?.sensitive && !showSensitive ? mask(payload[column]) : payload[column];
        return `${column}: ${value}`;
      })
      .join(" · ");

    return {
      id: request.id,
      app: request.app,
      action: request.action,
      summary,
      requestedBy: request.requestedBy,
      createdAt: request.createdAt.toISOString(),
      ownRequest: request.requestedBy === session.username,
    };
  });

  return (
    <div>
      <Text as="h1" size={600} weight="semibold">
        Approvals
      </Text>
      <ApprovalsList items={items} approve={approveRequest} />
    </div>
  );
}
