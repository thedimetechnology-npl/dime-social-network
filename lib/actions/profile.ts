"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "../auth";
import { db, ensureSchema } from "../db";

export async function updateProfile(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const headline = String(formData.get("headline") ?? "").trim().slice(0, 160);
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const about = String(formData.get("about") ?? "").trim().slice(0, 4000);
  if (!name) redirect("/profile/edit?error=name");

  await db()
    .prepare("UPDATE users SET name = ?, headline = ?, location = ?, about = ? WHERE id = ?")
    .bind(name, headline || null, location || null, about || null, user.id)
    .run();
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/profile/edit");
  redirect(`/profile/${user.id}?saved=1`);
}

/** Sets the avatar from an R2 key produced by POST /api/upload (must be owned by the user). */
export async function setAvatar(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const key = String(formData.get("key") ?? "").trim();
  if (!key.startsWith(`users/${user.id}/`)) redirect("/profile/edit?error=avatar");
  await db().prepare("UPDATE users SET avatar_key = ? WHERE id = ?").bind(key, user.id).run();
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/profile/edit");
}

export async function removeAvatar(): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const row = await db()
    .prepare("SELECT avatar_key FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ avatar_key: string | null }>();
  const key = row?.avatar_key;
  if (key && !key.startsWith("http")) {
    const { env } = await import("../cloudflare");
    try {
      await env().FILES.delete(key);
    } catch {
      // Best effort cleanup.
    }
  }
  await db().prepare("UPDATE users SET avatar_key = NULL WHERE id = ?").bind(user.id).run();
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/profile/edit");
}
