"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "../auth";
import { db, ensureSchema, uuid } from "../db";

/* ------------------------------------------------------------------- posts */

export async function createPost(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();

  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);
  let imageKey = String(formData.get("image_key") ?? "").trim();
  if (imageKey && !imageKey.startsWith(`posts/${user.id}/`)) imageKey = "";
  if (!body && !imageKey) return;

  await db()
    .prepare("INSERT INTO posts (id, author_id, body, image_key, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(uuid(), user.id, body, imageKey || null, Date.now())
    .run();
  revalidatePath("/");
}

export async function deletePost(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const id = String(formData.get("id") ?? "");
  const post = await db()
    .prepare("SELECT id, author_id, image_key FROM posts WHERE id = ?")
    .bind(id)
    .first<{ id: string; author_id: string; image_key: string | null }>();
  if (!post || post.author_id !== user.id) return;

  await db().prepare("DELETE FROM comments WHERE post_id = ?").bind(id).run();
  await db().prepare("DELETE FROM post_likes WHERE post_id = ?").bind(id).run();
  await db().prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  if (post.image_key) {
    const { env } = await import("../cloudflare");
    try {
      await env().FILES.delete(post.image_key);
    } catch {
      // Orphaned object is harmless; don't fail the delete.
    }
  }
  revalidatePath("/");
}

export async function toggleLike(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const postId = String(formData.get("post_id") ?? "");
  const existing = await db()
    .prepare("SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ?")
    .bind(postId, user.id)
    .first();
  if (existing) {
    await db().prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?").bind(postId, user.id).run();
  } else {
    await db()
      .prepare("INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)")
      .bind(postId, user.id, Date.now())
      .run();
  }
  revalidatePath("/");
}

export async function addComment(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  if (!postId || !body) return;
  const post = await db().prepare("SELECT id FROM posts WHERE id = ?").bind(postId).first();
  if (!post) return;
  await db()
    .prepare("INSERT INTO comments (id, post_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(uuid(), postId, user.id, body, Date.now())
    .run();
  revalidatePath("/");
}

/* ------------------------------------------------------------- connections */

export async function connectRequest(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const target = String(formData.get("user_id") ?? "");
  if (!target || target === user.id) return;

  const targetRow = await db().prepare("SELECT id FROM users WHERE id = ?").bind(target).first();
  if (!targetRow) return;

  const pair = await db()
    .prepare(
      "SELECT id, requester_id, addressee_id, status FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
    )
    .bind(user.id, target, target, user.id)
    .first<{ id: string; requester_id: string; addressee_id: string; status: string }>();

  if (pair) {
    // A pending request from the other side becomes an accepted connection.
    if (pair.status === "pending" && pair.requester_id === target && pair.addressee_id === user.id) {
      await db().prepare("UPDATE connections SET status = 'accepted' WHERE id = ?").bind(pair.id).run();
    }
  } else {
    await db()
      .prepare(
        "INSERT INTO connections (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
      )
      .bind(uuid(), user.id, target, Date.now())
      .run();
  }
  revalidatePath("/mynetwork");
  revalidatePath("/");
}

async function connectionFor(user: string, id: string) {
  return db()
    .prepare(
      "SELECT id, requester_id, addressee_id, status FROM connections WHERE id = ? AND (requester_id = ? OR addressee_id = ?)",
    )
    .bind(id, user, user)
    .first<{ id: string; requester_id: string; addressee_id: string; status: string }>();
}

export async function acceptRequest(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const id = String(formData.get("id") ?? "");
  const row = await db()
    .prepare("SELECT id, addressee_id, status FROM connections WHERE id = ?")
    .bind(id)
    .first<{ id: string; addressee_id: string; status: string }>();
  if (row && row.addressee_id === user.id && row.status === "pending") {
    await db().prepare("UPDATE connections SET status = 'accepted' WHERE id = ?").bind(id).run();
  }
  revalidatePath("/mynetwork");
}

export async function ignoreRequest(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const id = String(formData.get("id") ?? "");
  const row = await db()
    .prepare("SELECT id, addressee_id, status FROM connections WHERE id = ?")
    .bind(id)
    .first<{ id: string; addressee_id: string; status: string }>();
  if (row && row.addressee_id === user.id && row.status === "pending") {
    await db().prepare("DELETE FROM connections WHERE id = ?").bind(id).run();
  }
  revalidatePath("/mynetwork");
}

export async function withdrawRequest(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const id = String(formData.get("id") ?? "");
  const row = await db()
    .prepare("SELECT id, requester_id, status FROM connections WHERE id = ?")
    .bind(id)
    .first<{ id: string; requester_id: string; status: string }>();
  if (row && row.requester_id === user.id && row.status === "pending") {
    await db().prepare("DELETE FROM connections WHERE id = ?").bind(id).run();
  }
  revalidatePath("/mynetwork");
}

export async function removeConnection(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const id = String(formData.get("id") ?? "");
  const row = await connectionFor(user.id, id);
  if (row && row.status === "accepted") {
    await db().prepare("DELETE FROM connections WHERE id = ?").bind(id).run();
  }
  revalidatePath("/mynetwork");
}

/** True when the two users share an accepted connection. */
export async function isConnected(a: string, b: string): Promise<boolean> {
  await ensureSchema();
  const row = await db()
    .prepare(
      "SELECT id FROM connections WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))",
    )
    .bind(a, b, b, a)
    .first();
  return Boolean(row);
}

/* -------------------------------------------------------------- messaging */

export async function startConversation(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const other = String(formData.get("user_id") ?? "");
  if (!other || other === user.id) redirect("/messaging");
  if (!(await isConnected(user.id, other))) redirect("/messaging?error=notconnected");

  const low = [user.id, other].sort()[0];
  const high = [user.id, other].sort()[1];
  const existing = await db()
    .prepare("SELECT id FROM conversations WHERE user_low = ? AND user_high = ?")
    .bind(low, high)
    .first<{ id: string }>();
  if (existing) redirect(`/messaging/${existing.id}`);

  const id = uuid();
  await db()
    .prepare(
      "INSERT INTO conversations (id, user_low, user_high, last_message_at) VALUES (?, ?, ?, 0)",
    )
    .bind(id, low, high)
    .run();
  redirect(`/messaging/${id}`);
}

export async function sendMessage(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!conversationId || !body) return;

  const conv = await db()
    .prepare("SELECT id, user_low, user_high FROM conversations WHERE id = ?")
    .bind(conversationId)
    .first<{ id: string; user_low: string; user_high: string }>();
  if (!conv || (conv.user_low !== user.id && conv.user_high !== user.id)) redirect("/messaging");

  const ts = Date.now();
  await db()
    .prepare("INSERT INTO messages (id, conversation_id, sender_id, body, created_at, read_at) VALUES (?, ?, ?, ?, ?, NULL)")
    .bind(uuid(), conversationId, user.id, body, ts)
    .run();
  await db()
    .prepare("UPDATE conversations SET last_message_at = ? WHERE id = ?")
    .bind(ts, conversationId)
    .run();
  revalidatePath(`/messaging/${conversationId}`);
  revalidatePath("/messaging");
}
