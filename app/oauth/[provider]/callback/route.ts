import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db, ensureSchema, uuid } from "@/lib/db";
import { exchangeCode, fetchProfile, providerConfig, requestOrigin } from "@/lib/oauth";

/** GET /oauth/[provider]/callback — complete sign-in with Google / Microsoft. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = (req.headers.get("cookie") ?? "")
    .split(/;\s*/)
    .find((c) => c.startsWith("pl_oauth_state="))
    ?.slice("pl_oauth_state=".length);

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/signin?error=${reason}`, url.origin));

  if (!code || !state || !cookieState || state !== cookieState) return fail("state");

  let config;
  try {
    config = providerConfig(provider);
  } catch {
    return fail("provider");
  }
  if (!config) return fail("provider");

  const origin = requestOrigin(req);
  const tokens = await exchangeCode(config, code, `${origin}/oauth/${provider}/callback`);
  if (!tokens?.access_token) return fail("exchange");

  const profile = await fetchProfile(config, tokens.access_token);
  if (!profile) return fail("profile");

  try {
    await ensureSchema();

    // 1) Existing identity for this provider?
    const identity = await db()
      .prepare("SELECT user_id FROM identities WHERE provider = ? AND sub = ?")
      .bind(provider, profile.sub)
      .first<{ user_id: string }>();

    let userId: string;
    if (identity) {
      userId = identity.user_id;
    } else {
      // 2) Same email already registered (e.g. password account) -> link the identity.
      const existing = await db()
        .prepare("SELECT id, avatar_key FROM users WHERE email = ?")
        .bind(profile.email)
        .first<{ id: string; avatar_key: string | null }>();
      if (existing) {
        userId = existing.id;
      } else {
        // 3) Brand new account. Provider-verified emails count as verified.
        userId = uuid();
        await db()
          .prepare(
            "INSERT INTO users (id, email, name, password_hash, headline, about, location, avatar_key, verified, created_at) VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, 1, ?)",
          )
          .bind(userId, profile.email, profile.name.slice(0, 80), profile.picture ?? null, Date.now())
          .run();
      }
      await db()
        .prepare("INSERT INTO identities (provider, sub, user_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
        .bind(provider, profile.sub, userId)
        .run();
    }

    await createSession(userId);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return fail("internal");
  }

  const res = NextResponse.redirect(new URL("/?welcome=1", url.origin));
  res.cookies.delete("pl_oauth_state");
  return res;
}

