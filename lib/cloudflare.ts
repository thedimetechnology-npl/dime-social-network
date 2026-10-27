// Cloudflare runtime access for Next.js server code (OpenNext adapter).
// Typed with minimal structural interfaces so we don't need workers-types globally.
import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface D1Results<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Results<T>>;
  run(): Promise<{ success: boolean }>;
}

export interface D1Database {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Results[]>;
}

export interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

export interface AppEnv {
  DB: D1Database;
  FILES: R2Bucket;
  APP_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_TENANT?: string;
  KNOCK_API_KEY?: string;
  [key: string]: unknown;
}

export function env(): AppEnv {
  const ctx = getCloudflareContext() as unknown as { env: AppEnv };
  return ctx.env;
}

export function db(): D1Database {
  return env().DB;
}

/** Public origin of this deployment: APP_URL when configured, else the incoming request's origin. */
export async function appOrigin(): Promise<string> {
  const configured = env().APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const { headers } = await import("next/headers");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? (h.get("host")?.startsWith("localhost") ? "http" : "https");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function isLocalOrigin(): Promise<boolean> {
  const origin = await appOrigin();
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin);
}
