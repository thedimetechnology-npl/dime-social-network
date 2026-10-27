import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/cloudflare";
import { ensureSchema } from "@/lib/db";

const MAX_BYTES = 3 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/upload — stores an authenticated user's image in R2.
 * Body: multipart/form-data with field "file" and optional field "kind" (avatar | post).
 * Returns { key } for use in profile/post records.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length && length > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 3 MB)" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large (max 3 MB)" }, { status: 413 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Only PNG, JPEG, WebP or GIF" }, { status: 415 });

  const kind = String(form.get("kind") ?? "post") === "avatar" ? "users" : "posts";
  const key = `${kind}/${user.id}/${crypto.randomUUID()}.${ext}`;

  await ensureSchema();
  await env().FILES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  return NextResponse.json({ key });
}
