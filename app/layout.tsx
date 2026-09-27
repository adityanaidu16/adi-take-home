import { Body1, Divider, Link as FluentLink, Text } from "@fluentui/react-components";
import type { Metadata } from "next";
import { getSession } from "@/kit/auth/session";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Tools Kit",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <Providers>
          <header style={{ background: "#fff" }}>
            <div
              style={{
                margin: "0 auto",
                maxWidth: 1100,
                padding: "12px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <Text weight="semibold" size={400}>
                <FluentLink as="a" href="/" appearance="subtle">
                  Internal Tools
                </FluentLink>
              </Text>
              <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <FluentLink as="a" href="/approvals">
                  Approvals
                </FluentLink>
                <FluentLink as="a" href="/audit">
                  Audit log
                </FluentLink>
                {session ? (
                  <>
                    <Body1>
                      {session.name} · {session.groups.join(", ") || "no groups"}
                    </Body1>
                    <FluentLink href="/api/auth/logout">Sign out</FluentLink>
                  </>
                ) : (
                  <FluentLink href="/api/auth/login">Sign in</FluentLink>
                )}
              </nav>
            </div>
            <Divider />
          </header>
          <main style={{ margin: "0 auto", maxWidth: 1100, padding: "32px 24px" }}>{children}</main>
        </Providers>
      </body>
    </html>
  );
}

export const dynamic = "force-dynamic";
