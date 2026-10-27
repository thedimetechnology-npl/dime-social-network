import { cookies } from "next/headers";
import { db, ensureSchema } from "./db";

const SESSION_COOKIE = "pl_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 600_000;

const enc = new TextEncoder();

/* ------------------------------------------------------------------ tokens */

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(value: string) {
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

export async function sha256hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------------------------------------------------------------- passwords */

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltStr, hashStr] = stored.split("$");
    if (scheme !== "pbkdf2-sha256") return false;
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 100_000) return false;
    const salt = fromB64(saltStr);
    const expected = fromB64(hashStr);
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      key,
      expected.length * 8,
    );
    return timingSafeEqual(new Uint8Array(bits), expected);
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- sessions */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  headline: string | null;
  about: string | null;
  location: string | null;
  avatar_key: string | null;
  verified: number;
  created_at: number;
}

// Sessions are stateless: the cookie itself carries `userId.expiresAt` plus an
// HMAC signature, so any serverless instance can verify it without shared
// memory (the in-memory demo database is per-instance and not shared on Vercel).
// Set SESSION_SECRET to invalidate all outstanding sessions.
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dime-demo-session-secret-v1";

async function signSessionPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64url(new Uint8Array(sig));
}

/** Verifies the signed cookie; returns the user id, or null if invalid/expired. */
async function verifySessionCookie(raw: string): Promise<string | null> {
  try {
    const i = raw.lastIndexOf("."); // boundary: payload | signature
    const j = raw.lastIndexOf(".", i - 1); // boundary: userId | expiresAt
    if (i <= 0 || j <= 0) return null;
    const expected = await signSessionPayload(raw.slice(0, i));
    if (!timingSafeEqual(enc.encode(raw.slice(i + 1)), enc.encode(expected))) return null;
    const expiresAt = Number(raw.slice(j + 1, i));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return raw.slice(0, j);
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  const value = `${payload}.${await signSessionPayload(payload)}`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Current signed-in user, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  // Only touch the database once a session cookie is actually present, so pages
  // that merely check auth stay statically prerenderable at build time.
  const userId = await verifySessionCookie(raw);
  if (!userId) {
    // Stale or forged token: try to clear the cookie so the browser stops
    // sending it. Cookie mutation is only legal in Server Actions / Route
    // Handlers, so ignore failures during page renders — the stale token
    // simply keeps failing validation and is overwritten on the next sign-in.
    try {
      const jar2 = await cookies();
      jar2.delete(SESSION_COOKIE);
    } catch {
      // Not allowed to mutate cookies in this render context; safe to ignore.
    }
    return null;
  }

  // Demo users are seeded identically into every instance's memory, so any
  // instance can resolve the signed session to a user row.
  await ensureSchema();
  const row = await db()
    .prepare(
      `SELECT id, email, name, password_hash, headline, about, location,
              avatar_key, verified, created_at
         FROM users
        WHERE id = ?`,
    )
    .bind(userId)
    .first<SessionUser>();
  if (!row) {
    try {
      const jar2 = await cookies();
      jar2.delete(SESSION_COOKIE);
    } catch {
      // See above: ignore in render contexts.
    }
    return null;
  }
  return row;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

/* ------------------------------------------------------------ auth tokens */

/** Creates a single-use token (email verification / password reset), returns the raw value. */
export async function createAuthToken(userId: string, purpose: "verify" | "reset"): Promise<string> {
  await ensureSchema();
  const raw = randomToken(32);
  const tokenHash = await sha256hex(raw);
  const ttl = purpose === "verify" ? 24 : 2;
  await db()
    .prepare(
      "INSERT INTO auth_tokens (id, user_id, purpose, token_hash, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)",
    )
    .bind(crypto.randomUUID(), userId, purpose, tokenHash, Date.now() + ttl * 60 * 60 * 1000)
    .run();
  return raw;
}

/** Consumes a token if valid; returns the user id or null. */
export async function consumeAuthToken(raw: string, purpose: "verify" | "reset"): Promise<string | null> {
  await ensureSchema();
  const tokenHash = await sha256hex(raw);
  const row = await db()
    .prepare(
      "SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND purpose = ? AND used = 0 AND expires_at > ?",
    )
    .bind(tokenHash, purpose, Date.now())
    .first<{ id: string; user_id: string }>();
  if (!row) return null;
  await db().prepare("UPDATE auth_tokens SET used = 1 WHERE id = ?").bind(row.id).run();
  return row.user_id;
}
