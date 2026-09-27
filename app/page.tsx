import {
  Badge,
  Body1,
  Caption1,
  Card,
  CardHeader,
  Link as FluentLink,
  Text,
} from "@fluentui/react-components";
import { TableRegular } from "@fluentui/react-icons";
import { canView, rolesFor } from "@/kit/auth/roles";
import { getSession } from "@/kit/auth/session";
import { loadApps } from "@/kit/config/loader";
import { PageHeader } from "@/kit/ui/PageHeader";
import { SignInPrompt } from "@/kit/ui/SignInPrompt";

export const dynamic = "force-dynamic";

const badgeStyle = { whiteSpace: "nowrap", flexShrink: 0 } as const;

export default async function Home() {
  const session = await getSession();
  if (!session) return <SignInPrompt what="the apps you have access to" />;

  const apps = loadApps().map(({ slug, config }) => ({
    slug,
    config,
    visible: canView(config, rolesFor(config, session)),
  }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home" }]}
        title={`Hello, ${session.name.split(" ")[0]}`}
        subtitle={`Signed in as ${session.username} · ${session.groups.join(", ") || "no groups"}`}
      />

      <Text as="h2" weight="semibold" size={400}>
        Your apps
      </Text>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {apps.map(({ slug, config, visible }) => (
          <Card key={slug} appearance={visible ? "filled" : "outline"}>
            <CardHeader
              image={<TableRegular fontSize={28} />}
              header={
                visible ? (
                  <FluentLink as="a" href={`/apps/${slug}`}>
                    <Text weight="semibold">{config.name}</Text>
                  </FluentLink>
                ) : (
                  <Body1>{config.name}</Body1>
                )
              }
              description={<Caption1>Owner: {config.owner}</Caption1>}
              action={
                visible ? (
                  <Badge appearance="tint" color="success" style={badgeStyle}>
                    Open
                  </Badge>
                ) : (
                  <Badge appearance="tint" color="informative" style={badgeStyle}>
                    No access
                  </Badge>
                )
              }
            />
            <Caption1>Data source: {config.datasource}</Caption1>
          </Card>
        ))}
      </div>
      {apps.length === 0 && <Text>No apps configured yet.</Text>}
    </>
  );
}
