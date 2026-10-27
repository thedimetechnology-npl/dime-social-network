// Demo-mode runtime: in-memory SQLite (sql.js) + in-memory file store.
// Replaces the Cloudflare D1/R2 bindings so the app runs anywhere (Vercel, localhost)
// without any external database. Data resets to the seeded demo state on each cold start.
import initSqlJs from "sql.js/dist/sql-wasm-inline.js";
import type { Database } from "sql.js";

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

/* ------------------------------------------------------------------ sqlite */

let sqlitePromise: Promise<Database> | null = null;

function getSqlite(): Promise<Database> {
  if (!sqlitePromise) {
    sqlitePromise = initSqlJs().then((SQL) => new SQL.Database());
  }
  return sqlitePromise;
}

/** Execute a single SQL statement (DDL/INSERT/UPDATE/DELETE) with optional params. */
function execRaw(sql: string, params: unknown[]): Promise<void> {
  return getSqlite().then((db) => {
    if (params.length) db.run(sql, params as never[]);
    else db.run(sql);
  });
}

/* ----------------------------------------------------------------- D1 mock */

function createStatement(sql: string): D1Statement {
  let params: unknown[] = [];

  const stmt: D1Statement = {
    bind(...values: unknown[]) {
      params = values;
      return stmt;
    },
    async first<T = Record<string, unknown>>(): Promise<T | null> {
      const db = await getSqlite();
      const s = db.prepare(sql);
      try {
        if (params.length) s.bind(params as never[]);
        if (s.step()) return s.getAsObject() as T;
        return null;
      } finally {
        s.free();
      }
    },
    async all<T = Record<string, unknown>>(): Promise<D1Results<T>> {
      const db = await getSqlite();
      const s = db.prepare(sql);
      try {
        if (params.length) s.bind(params as never[]);
        const results: T[] = [];
        while (s.step()) results.push(s.getAsObject() as T);
        return { results, success: true };
      } finally {
        s.free();
      }
    },
    async run() {
      await execRaw(sql, params);
      return { success: true };
    },
  };

  return stmt;
}

const mockDb: D1Database = {
  prepare: createStatement,
  async batch(statements: D1Statement[]): Promise<D1Results[]> {
    const out: D1Results[] = [];
    for (const s of statements) {
      await s.run();
      out.push({ results: [], success: true });
    }
    return out;
  },
};

/* ---------------------------------------------------------------- R2 mock */

const fileStore = new Map<string, { data: Uint8Array; contentType: string }>();

async function toBytes(
  value: ArrayBuffer | ArrayBufferView | string | ReadableStream,
): Promise<Uint8Array> {
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  // ReadableStream
  const reader = value.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    if (chunk) {
      chunks.push(chunk);
      total += chunk.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

const mockFiles: R2Bucket = {
  async put(key, value, options) {
    const data = await toBytes(value);
    fileStore.set(key, {
      data,
      contentType: options?.httpMetadata?.contentType ?? "application/octet-stream",
    });
    return {};
  },
  async get(key) {
    const entry = fileStore.get(key);
    if (!entry) return null;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(entry.data);
        controller.close();
      },
    });
    return { body, httpMetadata: { contentType: entry.contentType } };
  },
  async delete(key) {
    fileStore.delete(key);
  },
};

/* ------------------------------------------------------------------- env */

const mockEnv: AppEnv = {
  DB: mockDb,
  FILES: mockFiles,
};

export function env(): AppEnv {
  return mockEnv;
}

export function db(): D1Database {
  return mockEnv.DB;
}

/** Public origin of this deployment: APP_URL when configured, else the incoming request's origin. */
export async function appOrigin(): Promise<string> {
  const configured = mockEnv.APP_URL;
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
