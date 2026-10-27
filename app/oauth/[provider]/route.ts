import { NextResponse } from "next/server";
import { providerConfig, requestOrigin } from "@/lib/oauth";

/** GET /oauth/[provider] — start the authorization code flow with a CSRF state cookie. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  let config;
  try {
    config = providerConfig(provider);
  } catch {
    return NextResponse.redirect(new URL("/signin?error=provider", req.url));
  }
  if (!config) return NextResponse.redirect(new URL("/signin?error=provider", req.url));

  const origin = requestOrigin(req);
  const random = crypto.getRandomValues(new Uint8Array(16));
  const state =
    crypto.randomUUID() +
    "." +
    Array.from(random)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const authorize = new URL(config.authorizeUrl);
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("redirect_uri", `${origin}/oauth/${provider}/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", config.scope);
  authorize.searchParams.set("state", state);
  if (provider === "google") authorize.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authorize);
  res.cookies.set("pl_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
