import { MessageBar, MessageBarBody, MessageBarTitle } from "@fluentui/react-components";
import type { ComponentType } from "react";

/**
 * Renders `apps/<slug>/dashboard.tsx` when an app ships one. The import is by
 * convention rather than registration, so adding a dashboard stays a file in
 * `apps/` — no code outside `apps/` changes. The module is lint-sandboxed to
 * the kit client API, so it still cannot reach data on its own.
 */
export async function AppDashboard({ slug }: { slug: string }) {
  let Dashboard: ComponentType<{ app: string }>;
  try {
    const mod = (await import(`../../../apps/${slug}/dashboard`)) as {
      default: ComponentType<{ app: string }>;
    };
    Dashboard = mod.default;
  } catch (err) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>Dashboard failed to load</MessageBarTitle>
          {(err as Error).message}
        </MessageBarBody>
      </MessageBar>
    );
  }

  return <Dashboard app={slug} />;
}
