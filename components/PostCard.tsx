import Link from "next/link";
import { addComment, deletePost, toggleLike } from "@/lib/actions/social";
import { relativeTime } from "@/lib/format";
import { Avatar } from "./Avatar";

export interface FeedPost {
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
}

export interface FeedComment {
  id: string;
  post_id: string;
  body: string;
  created_at: number;
  author_name: string;
  author_avatar: string | null;
}

export function PostCard({
  post,
  comments,
  liked,
  viewerId,
}: {
  post: FeedPost;
  comments: FeedComment[];
  liked: boolean;
  viewerId: string;
}) {
  return (
    <article className="sc-post" data-testid="post-card">
      <div className="sc-post-head">
        <Link href={`/profile/${post.author_id}`} className="shrink-0">
          <Avatar name={post.author_name} srcKey={post.author_avatar} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${post.author_id}`} className="font-bold text-[0.88rem] hover:underline break-words">
            {post.author_name}
          </Link>
          <div className="text-[0.72rem] muted break-words">
            {post.author_headline || "Professional"}
          </div>
          <div className="text-[0.68rem] text-[color:#a2a5bd]">
            {relativeTime(post.created_at)}
          </div>
        </div>
        {post.author_id === viewerId && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <button
              className="text-[0.72rem] font-semibold text-[color:var(--muted)] hover:text-[#d0391f]"
              type="submit"
              data-testid="delete-post"
            >
              Delete
            </button>
          </form>
        )}
      </div>

      {post.body && <p className="sc-post-body">{post.body}</p>}

      {post.image_key && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/files/${post.image_key}`}
          alt=""
          className="sc-post-media"
          loading="lazy"
        />
      )}

      {(post.like_count > 0 || post.comment_count > 0 || liked) && (
        <div className="sc-post-counts">
          <span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.27 1.27a5.5 5.5 0 0 0 7.77 0l4.39-4.39a5.5 5.5 0 0 0 0-7.78z" />
              <path d="M12 15.92a3 3 0 0 1 0-5.84" />
            </svg>
            {post.like_count > 0
              ? `${post.like_count} reaction${post.like_count === 1 ? "" : "s"}`
              : "You liked this"}
            </span>
            <span>
              {post.comment_count > 0
                ? `${post.comment_count} comment${post.comment_count === 1 ? "" : "s"}`
                : ""}
            </span>
        </div>
      )}

      {post.image_key && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/files/${post.image_key}`}
          alt=""
          className="sc-post-media"
          loading="lazy"
        />
      )}

      <div className="sc-post-bar">
        <form action={toggleLike} className="flex-1">
          <input type="hidden" name="post_id" value={post.id} />
          <button
            className={`sc-post-action w-full ${liked ? "sc-post-action--liked" : ""}`}
            type="submit"
            data-testid="like-button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.27 1.27a5.5 5.5 0 0 0 7.77 0l4.39-4.39a5.5 5.5 0 0 0 0-7.78z" />
              <path d="M12 15.92a3 3 0 0 1 0-5.84" />
            </svg>
            {liked ? "Liked" : "Like"}
          </button>
        </form>
        <span className="sc-post-action">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 18h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-2zm3-6h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2v-4zm2-8h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-2zm-8 8h2a2 2 0 0 0 2 2v2a2 2 0 0 0-2-2h-2v-2zm8-8h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-2z" />
          </svg>
          Comment
        </span>
        <span className="sc-post-action">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2v2h2" />
            <path d="M17 2h2v2h5a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-5v17a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-8l-2-2h-5a2 2 0 0 1-2-2v-1zM7 2l2 2H5a2 2 0 0 1-2-2V2z" />
          </svg>
          Share
        </span>
      </div>

      {comments.length > 0 && (
        <div className="sc-comments">
          {comments.map((c) => (
            <div key={c.id} className="sc-comment" data-testid="comment">
              <Avatar name={c.author_name} srcKey={c.author_avatar} size={26} />
              <div className="sc-comment-bubble">
                <div className="sc-comment-author">{c.author_name}</div>
                <div className="sc-comment-text">{c.body}</div>
                <div className="text-[0.66rem] text-[color:#a2a5bd] mt-0.5">
                  {relativeTime(c.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={addComment} className="sc-comment-form">
        <input type="hidden" name="post_id" value={post.id} />
        <input
          className="input"
          name="body"
          placeholder="Write a comment…"
          maxLength={1000}
          aria-label="Add a comment"
          data-testid="comment-input"
          style={{ background: "var(--surface-alt)", borderRadius: 999 }}
        />
        <button className="socimo-post-btn" type="submit">
          Send
        </button>
      </form>
    </article>
  );
}