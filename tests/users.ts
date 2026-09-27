import type { Session } from "@/kit/auth/session";

function user(username: string, name: string, groups: string[]): Session {
  return { subject: `oid-${username}`, username, name, groups };
}

export const sam = user("sam", "Sam Okafor", ["refunds-analysts"]);
export const priya = user("priya", "Priya Nair", ["refunds-approvers"]);
export const maria = user("maria", "Maria Alvarez", ["ops-leads"]);
export const jordan = user("jordan", "Jordan Lee", ["platform-eng"]);
