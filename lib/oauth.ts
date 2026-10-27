import { env } from "./cloudflare";

export interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
}

export interface OAuthProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

/** Returns null when the provider is unknown or not configured with credentials. */
export function providerConfig(provider: string): ProviderConfig | null {
  const e = env();
  if (provider === "google") {
    if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) return null;
    return {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userinfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
      scope: "openid email profile",
      clientId: e.GOOGLE_CLIENT_ID,
      clientSecret: e.GOOGLE_CLIENT_SECRET,
    };
  }
  if (provider === "microsoft") {
    if (!e.MICROSOFT_CLIENT_ID || !e.MICROSOFT_CLIENT_SECRET) return null;
    const tenant = e.MICROSOFT_TENANT || "common";
    return {
      authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userinfoUrl: "https://graph.microsoft.com/oidc/userinfo",
      scope: "openid email profile",
      clientId: e.MICROSOFT_CLIENT_ID,
      clientSecret: e.MICROSOFT_CLIENT_SECRET,
    };
  }
  return null;
}

/** True when a provider has both client id and secret configured. */
export function configuredProviders(): string[] {
  try {
    const e = env();
    const out: string[] = [];
    if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET) out.push("google");
    if (e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET) out.push("microsoft");
    return out;
  } catch {
    return [];
  }
}

export function providerLabel(provider: string): string {
  return provider === "google" ? "Google" : "Microsoft";
}

/** Public origin of this deployment, honoring forwarded headers from the platform proxy. */
export function requestOrigin(req: Request): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto");
  if (fwdHost) return `${fwdProto ?? "https"}://${fwdHost}`;
  const host = req.headers.get("host");
  if (host) return `${fwdProto ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  return new URL(req.url).origin;
}

/** Exchanges an authorization code for tokens. */
export async function exchangeCode(
  config: ProviderConfig,
  code: string,
  redirectUri: string,
): Promise<{ access_token?: string; id_token?: string } | null> {
  try {
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!res.ok) {
      console.error(`OAuth token exchange failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    return (await res.json()) as { access_token?: string };
  } catch (err) {
    console.error("OAuth token exchange error:", err);
    return null;
  }
}

/** Loads the user's profile from the provider's userinfo endpoint. */
export async function fetchProfile(config: ProviderConfig, accessToken: string): Promise<OAuthProfile | null> {
  try {
    const res = await fetch(config.userinfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error(`OAuth userinfo failed: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    const email = String(data.email ?? "").toLowerCase().trim();
    if (!data.sub || !email) return null;
    return {
      sub: String(data.sub),
      email,
      name: String(data.name || email.split("@")[0]),
      picture: data.picture ? String(data.picture) : undefined,
      emailVerified: data.email_verified === true || data.email_verified === "true",
    };
  } catch (err) {
    console.error("OAuth userinfo error:", err);
    return null;
  }
}
