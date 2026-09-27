import { readFileSync } from "node:fs";
import path from "node:path";

type Claims = { groups?: unknown; preferred_username?: unknown; sub?: unknown };

let cache: Record<string, string[]> | undefined;

function directory(): Record<string, string[]> {
  const file = process.env.DIRECTORY_FILE;
  if (!file) return {};
  if (!cache) {
    cache = JSON.parse(readFileSync(path.resolve(process.cwd(), file), "utf8")) as Record<
      string,
      string[]
    >;
  }
  return cache;
}

/**
 * Entra omits the `groups` claim entirely when a user is a member of more
 * groups than the token can carry ("group overage") and points at Graph
 * instead. Anything that reads group membership therefore has to fall back to
 * the directory rather than trusting the claim to be present. In production
 * that fallback is `GET /v1.0/me/memberOf`; locally it is a static file, which
 * is also how the mock identity provider's usernames get their groups.
 */
export function resolveGroups(claims: Claims): string[] {
  if (Array.isArray(claims.groups) && claims.groups.length > 0) {
    return claims.groups as string[];
  }
  const username = String(claims.preferred_username ?? claims.sub ?? "").split("@")[0];
  return directory()[username] ?? [];
}
