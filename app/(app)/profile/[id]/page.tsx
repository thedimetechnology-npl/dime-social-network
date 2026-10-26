import Link from "next/link";
import { notFound } from "next/navigation";
import {
  acceptRequest,
  connectRequest,
  ignoreRequest,
  startConversation,
  withdrawRequest,
} from "@/lib/actions/social";
import { Avatar } from "@/components/Avatar";
import { PostCard, type FeedComment, type FeedPost } from "@/components/PostCard";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

type Relation = "none" | "pending_out" | "pending_in" | "connected";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = (await currentUser())!;
  const { id } = await params;
  await ensureSchema();

  const profile = await db()
    .prepare(
      "SELECT id, email, name, headline, about, location, avatar_key, verified, created_at FROM users WHERE id = ?",
    )
    .bind(id)
    .first<{
      id: string;
      email: string;
      name: string;
      headline: string | null;
      about: string | null;
      location: string | null;
      avatar_key: string | null;
      verified: number;
      created_at: number;
    }>();
  if (!profile) notFound();

  const isSelf = profile.id === viewer.id;

  const relationRow = isSelf
    ? null
    : await db()
        .prepare(
          "SELECT id, requester_id, addressee_id, status FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
        )
        .bind(viewer.id, profile.id, profile.id, viewer.id)
        .first<{ id: string; requester_id: string; addressee_id: string; status: string }>();

  let relation: Relation = "none";
  let connectionRowId: string | null = null;
  if (relationRow) {
    connectionRowId = relationRow.id;
    if (relationRow.status === "accepted") relation = "connected";
    else if (relationRow.requester_id === viewer.id) relation = "pending_out";
    else relation = "pending_in";
  }

  const connectionCount = await db()
    .prepare(
      "SELECT COUNT(*) AS c FROM connections WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)",
    )
    .bind(profile.id, profile.id)
    .first<{ c: number }>();

  const postsResult = await db()
    .prepare(
      `SELECT p.id, p.body, p.image_key, p.created_at, p.author_id,
              u.name AS author_name, u.headline AS author_headline, u.avatar_key AS author_avatar,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments c2 WHERE c2.post_id = p.id) AS comment_count
         FROM posts p JOIN users u ON u.id = p.author_id
        WHERE p.author_id = ?
        ORDER BY p.created_at DESC LIMIT 20`,
    )
    .bind(profile.id)
    .all<FeedPost>();

  const posts = postsResult.results;
  const myLikes = new Set<string>();
  const commentsByPost = new Map<string, FeedComment[]>();
  if (posts.length > 0) {
    const placeholders = posts.map(() => "?").join(",");
    const [likesResult, commentsResult] = await Promise.all([
      db()
        .prepare(`SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${placeholders})`)
        .bind(viewer.id, ...posts.map((p) => p.id))
        .all<{ post_id: string }>(),
      db()
        .prepare(
          `SELECT c.id, c.post_id, c.body, c.created_at, u.name AS author_name, u.avatar_key AS author_avatar
             FROM comments c JOIN users u ON u.id = c.author_id
            WHERE c.post_id IN (${placeholders}) ORDER BY c.created_at ASC`,
        )
        .bind(...posts.map((p) => p.id))
        .all<{
          id: string;
          post_id: string;
          body: string;
          created_at: number;
          author_name: string;
          author_avatar: string | null;
        }>(),
    ]);
    for (const row of likesResult.results) myLikes.add(row.post_id);
    for (const row of commentsResult.results) {
      const list = commentsByPost.get(row.post_id) ?? [];
      list.push({
        id: row.id,
        post_id: row.post_id,
        body: row.body,
        created_at: row.created_at,
        author_name: row.author_name,
        author_avatar: row.author_avatar,
      });
      commentsByPost.set(row.post_id, list);
    }
  }

  const joined = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <div className="sc-profile-hero" data-testid="profile-card">
        <div className="sc-profile-hero-cover" />
        <div
          className="flex flex-col sm:flex-row gap-5"
          style={{ padding: "0 1.15rem 1.15rem", marginTop: "-2.6rem" }}
        >
          <span className="sc-profile-hero-avatar">
            <Avatar name={profile.name} srcKey={profile.avatar_key} size={112} />
          </span>
          <div className="min-w-0 flex-1 pt-3 sm:pt-11">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold break-words flex items-center gap-2" data-testid="profile-name">
                  {profile.name}
                  {profile.verified === 1 && (
                    <span title="Email verified" className="text-[color:var(--brand)] text-base">
                      ✓
                    </span>
                  )}
                </h1>
                <p className="muted break-words">{profile.headline || "Professional"}</p>
                <p className="small muted mt-1">
                  {profile.location ? `${profile.location} · ` : ""}Member since March 2025
                </p>
                <p className="small font-semibold mt-1" data-testid="connection-count">
                  {connectionCount?.c ?? 0} connection{(connectionCount?.c ?? 0) === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {isSelf && (
                  <>
                    <Link href="/profile/edit" className="btn btn-outline" data-testid="edit-profile">
                      Edit profile
                    </Link>
                    <Link href="/jobs/post" className="btn btn-ghost">
                      Post a job
                    </Link>
                  </>
                )}

                {!isSelf && relation === "none" && (
                  <form action={connectRequest}>
                    <input type="hidden" name="user_id" value={profile.id} />
                    <button className="btn btn-primary" type="submit" data-testid="connect-button">
                      Connect
                    </button>
                  </form>
                )}

                {!isSelf && relation === "pending_out" && (
                  <form action={withdrawRequest}>
                    <input type="hidden" name="id" value={connectionRowId ?? ""} />
                    <button className="btn btn-outline" type="submit" data-testid="withdraw-button">
                      Withdraw invitation
                    </button>
                  </form>
                )}

                {!isSelf && relation === "pending_in" && (
                  <>
                    <form action={acceptRequest}>
                      <input type="hidden" name="id" value={connectionRowId ?? ""} />
                      <button className="btn btn-primary" type="submit" data-testid="accept-button">
                        Accept
                      </button>
                    </form>
                    <form action={ignoreRequest}>
                      <input type="hidden" name="id" value={connectionRowId ?? ""} />
                      <button className="btn btn-ghost" type="submit">
                        Ignore
                      </button>
                    </form>
                  </>
                )}

                {!isSelf && relation === "connected" && (
                  <>
                    <form action={startConversation}>
                      <input type="hidden" name="user_id" value={profile.id} />
                      <button className="btn btn-primary" type="submit" data-testid="message-button">
                        Message
                      </button>
                    </form>
                    <span className="btn btn-ghost pointer-events-none">✓ Connected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sc-tabs">
        <span className="sc-tab sc-tab--active">About</span>
        <span className="sc-tab">Activity</span>
      </div>

      <div className="card card-pad">
        <h2 className="section-title mb-2">About</h2>
        {profile.about ? (
          <p className="whitespace-pre-wrap break-words">{profile.about}</p>
        ) : (
          <p className="muted small">
            {isSelf ? (
              <>
                Add a summary so people know what you do —{" "}
                <Link href="/profile/edit" className="link">
                  edit profile
                </Link>
                .
              </>
            ) : (
              "No summary yet."
            )}
          </p>
        )}
      </div>

      <section>
        <h2 className="section-title mb-3">Activity</h2>
        {posts.length === 0 ? (
          <div className="card card-pad">
            <p className="muted small">
              {isSelf ? "You haven’t posted anything yet." : `${profile.name} hasn’t posted yet.`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                comments={commentsByPost.get(post.id) ?? []}
                liked={myLikes.has(post.id)}
                viewerId={viewer.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
