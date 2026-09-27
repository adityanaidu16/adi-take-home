import { NextResponse, type NextRequest } from "next/server";
import { resolveGroups } from "@/kit/auth/directory";
import { getOidcClient, redirectUri } from "@/kit/auth/oidc";
import { SESSION_COOKIE, encodeSession, type Session } from "@/kit/auth/session";

export async function GET(request: NextRequest) {
  const state = request.cookies.get("oidc_state")?.value;
  const nonce = request.cookies.get("oidc_nonce")?.value;
  if (!state || !nonce) {
    return NextResponse.redirect(new URL("/?error=missing_state", request.url));
  }

  const client = await getOidcClient();
  const params = client.callbackParams(request.url);
  const tokenSet = await client.callback(redirectUri(), params, { state, nonce });
  const claims = tokenSet.claims();

  const session: Session = {
    subject: String(claims.oid ?? claims.sub),
    username: String(claims.preferred_username ?? claims.sub).split("@")[0],
    name: String(claims.name ?? claims.sub),
    groups: resolveGroups(claims),
  };

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE, await encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  response.cookies.delete("oidc_state");
  response.cookies.delete("oidc_nonce");
  return response;
}
