/**
 * Microsoft Graph client. Production code: app-only client credentials, paged
 * reads, PATCH writes. Every endpoint comes from an environment variable, so
 * pointing at a real tenant is a configuration change, not a code change.
 */

type TokenResponse = { access_token: string; expires_in: number };

let cached: { token: string; expiresAt: number } | null = null;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function resetTokenCache(): void {
  cached = null;
}

export async function getGraphToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env("GRAPH_CLIENT_ID"),
    client_secret: env("GRAPH_CLIENT_SECRET"),
    scope: process.env.GRAPH_SCOPE ?? "https://graph.microsoft.com/.default",
  });

  const res = await fetch(env("GRAPH_TOKEN_URL"), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Graph token request failed: ${res.status}`);

  const json = (await res.json()) as TokenResponse;
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

async function graphFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getGraphToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Graph request failed: ${res.status} ${url}`);
  return res;
}

export type GraphListItem = { id: string; fields: Record<string, unknown> };

/** Reads every page of a SharePoint list, following @odata.nextLink. */
export async function listItems(siteId: string, listId: string): Promise<GraphListItem[]> {
  let url: string | undefined =
    `${env("GRAPH_BASE_URL")}/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields`;
  const items: GraphListItem[] = [];

  while (url) {
    const res = await graphFetch(url);
    const page = (await res.json()) as {
      value: GraphListItem[];
      "@odata.nextLink"?: string;
    };
    items.push(...page.value);
    url = page["@odata.nextLink"];
  }

  return items;
}

export async function patchItemFields(
  siteId: string,
  listId: string,
  itemId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await graphFetch(
    `${env("GRAPH_BASE_URL")}/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`,
    { method: "PATCH", body: JSON.stringify(fields) },
  );
}
