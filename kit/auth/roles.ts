import type { AppConfig } from "@/kit/config/schema";
import type { Session } from "./session";

/**
 * Maps identity-provider groups to app roles. In Entra ID the `groups` claim
 * carries group object IDs, so production maps role -> group GUID (or uses
 * Entra app roles and the `roles` claim). See the README.
 */
export function rolesFor(config: AppConfig, session: Session): string[] {
  return Object.entries(config.roles)
    .filter(([, groups]) => groups.some((g) => session.groups.includes(g)))
    .map(([role]) => role);
}

export function canView(config: AppConfig, roles: string[]): boolean {
  return config.view.visible_to.some((r) => roles.includes(r));
}

export function canSeeSensitive(config: AppConfig, roles: string[]): boolean {
  return config.view.show_sensitive_to.some((r) => roles.includes(r));
}
