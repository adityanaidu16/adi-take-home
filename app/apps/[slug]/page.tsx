import Link from "next/link";
import { getSession } from "@/kit/auth/session";
import { ActionButton } from "@/kit/ui/ActionButton";
import { AccessDenied, getAppView } from "@/kit/view";
import { runAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AppPage({ params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) {
    return (
      <p className="text-sm">
        <a href="/api/auth/login" className="text-blue-700 underline">
          Sign in
        </a>{" "}
        to view this app.
      </p>
    );
  }

  let view;
  try {
    view = await getAppView(params.slug, session);
  } catch (err) {
    const denied = err instanceof AccessDenied;
    return (
      <div className="rounded border bg-white p-6">
        <h1 className="text-lg font-semibold">{denied ? "No access" : "Cannot load app"}</h1>
        <p className="mt-2 text-sm text-slate-600">{(err as Error).message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">{view.config.name}</h1>
        <div className="text-sm text-slate-500">
          your roles: {view.roles.join(", ") || "none"} · source: {view.origin}
        </div>
      </div>

      {view.isApprover && (
        <p className="mt-2 text-sm">
          <Link href="/approvals" className="text-blue-700 hover:underline">
            Approvals queue
          </Link>
        </p>
      )}

      <table className="mt-4 w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b text-left">
            {view.columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium text-slate-600">
                {c}
              </th>
            ))}
            {view.actions.length > 0 && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={String(row.id)} className="border-b">
              {view.columns.map((c) => (
                <td key={c} className="px-3 py-2">
                  {String(row[c])}
                </td>
              ))}
              {view.actions.length > 0 && (
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-2">
                    {view.actions.map((action) => (
                      <ActionButton
                        key={action.name}
                        label={action.label}
                        risk={action.risk}
                        run={runAction.bind(null, view.slug, action.name, String(row.id))}
                      />
                    ))}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {view.rows.length === 0 && <p className="mt-4 text-sm text-slate-600">No records.</p>}
    </div>
  );
}
