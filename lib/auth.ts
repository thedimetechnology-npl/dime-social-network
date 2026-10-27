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

export async function createSession(userId: string): Promise<void> {
  await ensureSchema();
  const token = randomToken();
  const tokenHash = await sha256hex(token);
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await db()
    .prepare("INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, tokenHash, createdAt, expiresAt)
    .run();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = await sha256hex(token);
    await ensureSchema();
    await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  jar.delete(SESSION_COOKIE);
}

/** Current signed-in user, or null. Cleans up stale sessions opportunistically. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Only touch the database once a session cookie is actually present, so pages
  // that merely check auth stay statically prerenderable at build time.
  await ensureSchema();
  const tokenHash = await sha256hex(token);
  const row = await db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.password_hash, u.headline, u.about, u.location,
              u.avatar_key, u.verified, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, Date.now())
    .first<SessionUser>();
  if (!row) {
    // Stale or unknown token: clear the cookie so the browser stops sending it.
    const jar2 = await cookies();
    jar2.delete(SESSION_COOKIE);
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
