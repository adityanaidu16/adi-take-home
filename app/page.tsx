import Link from "next/link";
import { rolesFor, canView } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApps } from "@/kit/config/loader";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="rounded border bg-white p-6">
        <h1 className="text-xl font-semibold">Internal Tools Kit</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your organisation account to see the apps you have access to.
        </p>
        <a
          href="/api/auth/login"
          className="mt-4 inline-block rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Sign in
        </a>
      </div>
    );
  }

  const apps = loadApps().map(({ slug, config }) => ({
    slug,
    config,
    visible: canView(config, rolesFor(config, session)),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Apps</h1>
      <ul className="mt-4 space-y-2">
        {apps.map(({ slug, config, visible }) => (
          <li key={slug} className="rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{config.name}</div>
                <div className="text-sm text-slate-500">
                  owner: {config.owner} · data source: {config.datasource}
                </div>
              </div>
              {visible ? (
                <Link href={`/apps/${slug}`} className="text-sm text-blue-700 hover:underline">
                  Open
                </Link>
              ) : (
                <span className="text-sm text-slate-400">No access</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {apps.length === 0 && <p className="text-sm text-slate-600">No apps configured yet.</p>}
    </div>
  );
}
