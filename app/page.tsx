import { Button, Card, Link as FluentLink, Text } from "@fluentui/react-components";
import { rolesFor, canView } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApps } from "@/kit/config/loader";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    return (
      <Card>
        <Text as="h1" size={600} weight="semibold">
          Internal Tools Kit
        </Text>
        <Text>Sign in with your organisation account to see the apps you have access to.</Text>
        <div>
          <Button as="a" href="/api/auth/login" appearance="primary">
            Sign in
          </Button>
        </div>
      </Card>
    );
  }

  const apps = loadApps().map(({ slug, config }) => ({
    slug,
    config,
    visible: canView(config, rolesFor(config, session)),
  }));

  return (
    <div>
      <Text as="h1" size={600} weight="semibold">
        Apps
      </Text>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {apps.map(({ slug, config, visible }) => (
          <Card key={slug}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <div>
                <Text weight="semibold">{config.name}</Text>
                <div>
                  <Text size={200}>
                    owner: {config.owner} · data source: {config.datasource}
                  </Text>
                </div>
              </div>
              {visible ? (
                <FluentLink as="a" href={`/apps/${slug}`}>
                  Open
                </FluentLink>
              ) : (
                <Text size={200}>No access</Text>
              )}
            </div>
          </Card>
        ))}
      </div>
      {apps.length === 0 && <Text>No apps configured yet.</Text>}
    </div>
  );
}
