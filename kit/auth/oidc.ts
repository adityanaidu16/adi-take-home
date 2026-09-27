import { Issuer, type Client } from "openid-client";

let clientPromise: Promise<Client> | null = null;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * Standard OIDC, configured only by environment variables. Switching to
 * Entra ID means changing OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET.
 */
export function getOidcClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Issuer.discover(env("OIDC_ISSUER")).then(
      (issuer) =>
        new issuer.Client({
          client_id: env("OIDC_CLIENT_ID"),
          client_secret: env("OIDC_CLIENT_SECRET"),
          redirect_uris: [env("OIDC_REDIRECT_URI")],
          response_types: ["code"],
        }),
    );
  }
  return clientPromise;
}

export function redirectUri(): string {
  return env("OIDC_REDIRECT_URI");
}
