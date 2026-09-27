import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/kit/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Tools Kit",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold">
              Internal Tools
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/approvals" className="text-slate-600 hover:text-slate-900">
                Approvals
              </Link>
              <Link href="/audit" className="text-slate-600 hover:text-slate-900">
                Audit log
              </Link>
              {session ? (
                <>
                  <span className="text-slate-500">
                    {session.name} · {session.groups.join(", ") || "no groups"}
                  </span>
                  <a href="/api/auth/logout" className="text-slate-600 hover:text-slate-900">
                    Sign out
                  </a>
                </>
              ) : (
                <a href="/api/auth/login" className="text-slate-600 hover:text-slate-900">
                  Sign in
                </a>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
