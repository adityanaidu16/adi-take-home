import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "kit_session";

export type Session = {
  /** Stable identifier from the identity provider (Entra ID: the `oid` claim). */
  subject: string;
  username: string;
  name: string;
  /** Mirrors the Entra ID `groups` claim. */
  groups: string[];
};

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("Missing SESSION_SECRET");
  return new TextEncoder().encode(value);
}

export async function encodeSession(session: Session): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      subject: String(payload.subject),
      username: String(payload.username),
      name: String(payload.name),
      groups: Array.isArray(payload.groups) ? (payload.groups as string[]) : [],
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  return session;
}
