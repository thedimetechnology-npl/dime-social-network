import { ensureSchema } from "@/lib/db";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

/**
 * GET /files/[...key] — serves stored images (avatars, post images) from R2.
 * Keys are validated to prevent traversal; objects are immutable, so long caching is safe.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> },
) {
  const { key } = await ctx.params;
  const segments = key.map((s) => decodeURIComponent(s));
  if (segments.length < 2 || segments.some((s) => !s || s === "." || s === ".." || s.includes("/"))) {
    return new Response("Not found", { status: 404 });
  }
  const objectKey = segments.join("/");

  await ensureSchema();
  const { env } = await import("@/lib/cloudflare");
  const object = await env().FILES.get(objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  const ext = objectKey.split(".").pop()?.toLowerCase() ?? "";
  const contentType = object.httpMetadata?.contentType ?? CONTENT_TYPES[ext] ?? "application/octet-stream";

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
