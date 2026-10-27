import { db } from "./cloudflare";
import { seedDemoData } from "./seed";

// Re-export so app code can import { db } from "@/lib/db" alongside schema helpers.
export { db } from "./cloudflare";

/**
 * All application tables. DDL is idempotent (CREATE ... IF NOT EXISTS) and is
 * re-run once per isolate boot, which keeps local Wrangler and the deployed
 * Worker self-initializing without a separate migration step.
 */
const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT,
    headline TEXT,
    about TEXT,
    location TEXT,
    avatar_key TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS identities (
    provider TEXT NOT NULL,
    sub TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (provider, sub)
  )`,
  `CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    purpose TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    image_key TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS post_likes (
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (post_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    addressee_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_pair ON connections (requester_id, addressee_id)`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_low TEXT NOT NULL,
    user_high TEXT NOT NULL,
    last_message_at INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_low, user_high)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    poster_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    salary TEXT,
    description TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (job_id, user_id)
  )`,
];

let ready: Promise<void> | null = null;

/** Ensure the schema exists and demo data is seeded (idempotent, cached per isolate). */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = db()
      .batch(DDL.map((sql) => db().prepare(sql)))
      .then(() => seedDemoData(db()))
      .then(() => undefined)
      .catch((err) => {
        ready = null;
        throw err;
      });
  }
  return ready;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
