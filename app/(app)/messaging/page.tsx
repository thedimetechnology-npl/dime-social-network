import Link from "next/link";
import { RefreshTicker } from "@/components/RefreshTicker";
import { Avatar } from "@/components/Avatar";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messaging" };

interface ConversationRow {
  id: string;
  last_message_at: number;
  last_body: string | null;
  last_sender_id: string | null;
  unread: number;
  other_id: string;
  other_name: string;
  other_headline: string | null;
  other_avatar: string | null;
}

export default async function MessagingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = (await currentUser())!;
  const { error } = await searchParams;
  await ensureSchema();

  const conversations = await db()
    .prepare(
      `SELECT cv.id,
              cv.last_message_at,
              (SELECT m.body FROM messages m WHERE m.conversation_id = cv.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
              (SELECT m.sender_id FROM messages m WHERE m.conversation_id = cv.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_id,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = cv.id AND m.sender_id <> ? AND m.read_at IS NULL) AS unread,
              u.id AS other_id, u.name AS other_name, u.headline AS other_headline, u.avatar_key AS other_avatar
         FROM conversations cv
         JOIN users u ON u.id = CASE WHEN cv.user_low = ? THEN cv.user_high ELSE cv.user_low END
        WHERE cv.user_low = ? OR cv.user_high = ?
        ORDER BY cv.last_message_at DESC
        LIMIT 50`,
    )
    .bind(user.id, user.id, user.id, user.id)
    .all<ConversationRow>();

  return (
    <div className="max-w-3xl mx-auto">
      <RefreshTicker intervalMs={5000} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Messaging</h1>
        <span className="small muted">{conversations.results.length} conversation(s)</span>
      </div>

      {error === "notconnected" && (
        <div className="alert alert-error" data-testid="messaging-error">
          You can only message people you’re connected with.
        </div>
      )}

      {conversations.results.length === 0 ? (
        <div className="card card-pad text-center" data-testid="no-conversations">
          <p className="font-semibold mb-1">No conversations yet</p>
          <p className="muted small">
            Connect with professionals in{" "}
            <Link href="/mynetwork" className="link">
              My Network
            </Link>{" "}
            and start a conversation from their profile.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-[color:var(--line)] overflow-hidden">
          {conversations.results.map((c) => (
            <Link
              key={c.id}
              href={`/messaging/${c.id}`}
              className="flex items-center gap-3 p-4 hover:bg-black/5 block"
              data-testid="conversation-row"
            >
              <Avatar name={c.other_name} srcKey={c.other_avatar} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold truncate">{c.other_name}</span>
                  <span className="small muted shrink-0">
                    {c.last_message_at ? relativeTime(c.last_message_at) : ""}
                  </span>
                </div>
                <div className="small muted truncate">{c.other_headline || "Professional"}</div>
                <div className={`text-sm truncate ${c.unread ? "font-semibold text-[color:var(--ink)]" : "muted"}`}>
                  {c.last_body
                    ? `${c.last_sender_id === user.id ? "You: " : ""}${c.last_body}`
                    : "No messages yet"}
                </div>
              </div>
              {!!c.unread && <span className="badge-dot">{c.unread > 99 ? "99+" : c.unread}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
