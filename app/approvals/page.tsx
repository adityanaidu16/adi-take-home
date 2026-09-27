import { approveRequest } from "@/app/apps/[slug]/actions";
import { pendingRequestsFor } from "@/kit/approvals/engine";
import { getDataSource, type Row } from "@/kit/blocks";
import { canSeeSensitive, rolesFor } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApp } from "@/kit/config/loader";
import { ActionButton } from "@/kit/ui/ActionButton";
import { mask } from "@/kit/view";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <p className="text-sm">
        <a href="/api/auth/login" className="text-blue-700 underline">
          Sign in
        </a>{" "}
        to view approvals.
      </p>
    );
  }

  const requests = await pendingRequestsFor(session);

  const rows = requests.map((request) => {
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
    return { request, summary };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Approvals</h1>
      {rows.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">Nothing waiting for your approval.</p>
      )}
      <ul className="mt-4 space-y-3">
        {rows.map(({ request, summary }) => (
          <li key={request.id} className="rounded border bg-white p-4 text-sm">
            <div className="font-medium">
              {request.action} · {request.app}
            </div>
            <div className="mt-1 text-slate-600">{summary}</div>
            <div className="mt-1 text-slate-500">
              requested by {request.requestedBy} · {request.createdAt.toISOString()}
            </div>
            <div className="mt-3">
              {request.requestedBy === session.username ? (
                <span className="text-xs text-slate-500">
                  Maker-checker: you cannot approve your own request.
                </span>
              ) : (
                <ActionButton label="Approve" run={approveRequest.bind(null, request.id)} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
