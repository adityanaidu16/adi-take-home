import { Button, Card, Text, Title3 } from "@fluentui/react-components";

export function SignInPrompt({ what }: { what: string }) {
  return (
    <Card style={{ maxWidth: 480, padding: 24, display: "grid", gap: 12 }}>
      <Title3>Sign in</Title3>
      <Text>Sign in with your organisation account to see {what}.</Text>
      <div>
        <Button as="a" href="/api/auth/login" appearance="primary">
          Sign in
        </Button>
      </div>
    </Card>
  );
}
