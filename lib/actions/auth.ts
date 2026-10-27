"use server";

import { redirect } from "next/navigation";
import {
  consumeAuthToken,
  createAuthToken,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "../auth";
import { appOrigin, isLocalOrigin } from "../cloudflare";
import { db, ensureSchema, uuid } from "../db";
import { emailDeliveryEnabled, sendMail } from "../email";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

/** Email delivery availability, guarded so signup never crashes on missing config. */
function emailDeliverySafe(): boolean {
  try {
    return emailDeliveryEnabled();
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ signup */

export async function signup(formData: FormData): Promise<void> {
  await ensureSchema();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!name) redirect("/signup?error=name");
  if (!EMAIL_RE.test(email)) redirect("/signup?error=email");
  if (password.length < 8) redirect("/signup?error=password");

  const existing = await db().prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) redirect("/signup?error=exists");

  // Without a configured delivery provider we cannot send verification mail;
  // accounts are then created verified and the UI surfaces that clearly.
  const deliveryConfigured = emailDeliverySafe();
  const verified = deliveryConfigured ? 0 : 1;
  const id = uuid();
  await db()
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, headline, about, location, avatar_key, verified, created_at) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)",
    )
    .bind(id, email, name, await hashPassword(password), verified, Date.now())
    .run();

  if (deliveryConfigured) {
    const raw = await createAuthToken(id, "verify");
    const url = `${await appOrigin()}/verify-email?token=${raw}`;
    await sendMail({
      to: email,
      subject: "Verify your Dime Social Network email",
      text: `Hi ${name}, confirm your email address to finish setting up your profile: ${url}`,
      workflow: "email_verification",
      data: { verify_url: url },
    });
  }

  await createSession(id);
  redirect("/?welcome=1");
}

/* ------------------------------------------------------------------ signin */

export async function signin(formData: FormData): Promise<void> {
  await ensureSchema();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const user = await db()
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; password_hash: string | null }>();
  if (!user?.password_hash) redirect("/signin?error=invalid");
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) redirect("/signin?error=invalid");
  await createSession(user.id);
  redirect("/");
}

/* ----------------------------------------------------------------- signout */

export async function signout(): Promise<void> {
  await destroySession();
  redirect("/signin");
}

/* ---------------------------------------------------------- password reset */

export async function forgotPassword(formData: FormData): Promise<void> {
  await ensureSchema();
  const email = normalizeEmail(formData.get("email"));
  const user = await db().prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();

  if (user) {
    const raw = await createAuthToken(user.id, "reset");
    const url = `${await appOrigin()}/reset-password?token=${raw}`;
    const result = await sendMail({
      to: email,
      subject: "Reset your Dime Social Network password",
      text: `Reset your Dime Social Network password: ${url}  This link expires in 2 hours.`,
      workflow: "password_reset",
      data: { reset_url: url },
    });
    // Local fallback when no email provider is configured: hand the link over on-screen.
    if (!result.delivered && (await isLocalOrigin())) {
      redirect(`/forgot-password?sent=1&devToken=${raw}`);
    }
  }
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData): Promise<void> {
  await ensureSchema();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8 || password !== confirm) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=password`);
  }
  const userId = await consumeAuthToken(token, "reset");
  if (!userId) redirect("/reset-password?error=expired");

  await db()
    .prepare("UPDATE users SET password_hash = ?, verified = 1 WHERE id = ?")
    .bind(await hashPassword(password), userId)
    .run();
  // Kill every existing session for this account after a credential change.
  await db().prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  await createSession(userId);
  redirect("/?password_reset=1");
}
