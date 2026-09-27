import type { Metadata } from "next";
import { canView, rolesFor } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApps } from "@/kit/config/loader";
import { Shell, type NavApp } from "@/kit/ui/Shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Tools",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  const apps: NavApp[] = loadApps().map(({ slug, config }) => ({
    slug,
    name: config.name,
    visible: session ? canView(config, rolesFor(config, session)) : false,
  }));

  return (
    <html lang="en">
      <body>
        <Providers>
          <Shell
            apps={apps}
            user={
              session
                ? { name: session.name, username: session.username, groups: session.groups }
                : null
            }
          >
            {children}
          </Shell>
        </Providers>
      </body>
    </html>
  );
}

export const dynamic = "force-dynamic";
