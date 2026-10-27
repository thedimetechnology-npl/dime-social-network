import Link from "next/link";
import { PostComposer } from "@/components/PostComposer";
import { PostCard, type FeedComment, type FeedPost } from "@/components/PostCard";
import { Stories } from "@/components/Stories";
import { createPost } from "@/lib/actions/social";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

const NOTICE_MESSAGES: Record<string, string> = {
  welcome: "Welcome to Dime Social Network! Finish your profile so people can find you.",
  verified: "Your email is verified — thanks!",
  password_reset: "Password updated. You’re signed in with your new password.",
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = (await currentUser())!;
  const sp = await searchParams;
  const noticeKey = Object.keys(NOTICE_MESSAGES).find((k) => sp[k]);

  await ensureSchema();

  const postsResult = await db()
    .prepare(
      `SELECT p.id, p.body, p.image_key, p.created_at, p.author_id,
              u.name AS author_name, u.headline AS author_headline, u.avatar_key AS author_avatar,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
         FROM posts p
         JOIN users u ON u.id = p.author_id
        ORDER BY p.created_at DESC
        LIMIT 50`,
    )
    .all<{
      id: string;
      body: string;
      image_key: string | null;
      created_at: number;
      author_id: string;
      author_name: string;
      author_headline: string | null;
      author_avatar: string | null;
      like_count: number;
      comment_count: number;
    }>();
  const posts = postsResult.results;

  const myLikes = new Set<string>();
  const commentsByPost = new Map<string, FeedComment[]>();
  if (posts.length > 0) {
    const placeholders = posts.map(() => "?").join(",");
    const [likesResult, commentsResult] = await Promise.all([
      db()
        .prepare(`SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${placeholders})`)
        .bind(user.id, ...posts.map((p) => p.id))
        .all<{ post_id: string }>(),
      db()
        .prepare(
          `SELECT c.id, c.post_id, c.body, c.created_at, u.name AS author_name, u.avatar_key AS author_avatar
             FROM comments c
             JOIN users u ON u.id = c.author_id
            WHERE c.post_id IN (${placeholders})
            ORDER BY c.created_at ASC`,
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

  const recentPeople = await db()
    .prepare(
      `SELECT id, name, avatar_key FROM users
        WHERE id <> ?
        ORDER BY created_at DESC LIMIT 10`,
    )
    .bind(user.id)
    .all<{ id: string; name: string; avatar_key: string | null }>();

  return (
    <div className="flex flex-col gap-4">
      {noticeKey && (
        <div className="alert alert-ok mb-0" role="status" data-testid="feed-notice">
          {NOTICE_MESSAGES[noticeKey]}
        </div>
      )}

      <Stories people={recentPeople.results} />

      <PostComposer
        user={{ name: user.name, headline: user.headline, avatar_key: user.avatar_key }}
        createPost={createPost}
      />

      {posts.length === 0 && (
        <div className="card card-pad text-center" data-testid="empty-feed">
          <p className="font-semibold mb-1">No posts yet</p>
          <p className="muted small mb-0">
            Share your first update above, or find people to connect with in{" "}
            <Link href="/mynetwork" className="link">
              My Network
            </Link>
            .
          </p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          comments={commentsByPost.get(post.id) ?? []}
          liked={myLikes.has(post.id)}
          viewerId={user.id}
        />
      ))}
    </div>
  );
}
