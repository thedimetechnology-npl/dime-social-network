import { NextResponse } from "next/server";
import { consumeAuthToken } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

/**
 * GET /verify-email?token=... — consumes a verification token and marks the email verified.
 * Linked from verification emails.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return NextResponse.redirect(new URL("/signin?error=expired", url.origin));

  await ensureSchema();
  const userId = await consumeAuthToken(token, "verify");
  if (!userId) return NextResponse.redirect(new URL("/signin?error=expired", url.origin));

  await db().prepare("UPDATE users SET verified = 1 WHERE id = ?").bind(userId).run();
  return NextResponse.redirect(new URL("/?verified=1", url.origin));
}
