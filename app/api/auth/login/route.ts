import { NextResponse } from "next/server";
import { generators } from "openid-client";
import { getOidcClient, redirectUri } from "@/kit/auth/oidc";

export async function GET() {
  const client = await getOidcClient();
  const state = generators.state();
  const nonce = generators.nonce();

  const url = client.authorizationUrl({
    scope: "openid profile email",
    redirect_uri: redirectUri(),
    state,
    nonce,
  });

  const response = NextResponse.redirect(url);
  const options = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set("oidc_state", state, options);
  response.cookies.set("oidc_nonce", nonce, options);
  return response;
}
