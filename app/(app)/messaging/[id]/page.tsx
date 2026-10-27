import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sendMessage } from "@/lib/actions/social";
import { Avatar } from "@/components/Avatar";
import { RefreshTicker } from "@/components/RefreshTicker";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation" };

interface MessageRow {
  id: string;
  sender_id: string;
  body: string;
  created_at: number;
}

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await currentUser())!;
  const { id } = await params;
  await ensureSchema();

  const conv = await db()
    .prepare("SELECT id, user_low, user_high FROM conversations WHERE id = ?")
    .bind(id)
    .first<{ id: string; user_low: string; user_high: string }>();
  if (!conv || (conv.user_low !== user.id && conv.user_high !== user.id)) notFound();

  const otherId = conv.user_low === user.id ? conv.user_high : conv.user_low;
  const other = await db()
    .prepare("SELECT id, name, headline, avatar_key FROM users WHERE id = ?")
    .bind(otherId)
    .first<{ id: string; name: string; headline: string | null; avatar_key: string | null }>();
  if (!other) notFound();

  // Mark incoming messages as read (idempotent) before rendering the thread.
  await db()
    .prepare(
      "UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL",
    )
    .bind(Date.now(), id, user.id)
    .run();

  const messages = await db()
    .prepare(
      "SELECT id, sender_id, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 500",
    )
    .bind(id)
    .all<MessageRow>();

  return (
    <div className="max-w-3xl mx-auto">
      <RefreshTicker intervalMs={4000} />

      <div className="flex items-center gap-3 mb-4">
        <Link href="/messaging" className="link small">
          ← All messages
        </Link>
      </div>

      <div className="card overflow-hidden flex flex-col" style={{ minHeight: "60vh" }}>
        <div className="flex items-center gap-3 p-4 border-b border-[color:var(--line)]">
          <Link href={`/profile/${other.id}`}>
            <Avatar name={other.name} srcKey={other.avatar_key} size={40} />
          </Link>
          <div className="min-w-0">
            <Link href={`/profile/${other.id}`} className="font-semibold hover:underline">
              {other.name}
            </Link>
            <div className="small muted truncate">{other.headline || "Professional"}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto bg-[color:var(--bg)]" data-testid="thread">
          {messages.results.length === 0 && (
            <p className="muted small text-center mt-6">
              Say hello — this is the start of your conversation with {other.name}.
            </p>
          )}
          {messages.results.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid="message">
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm break-words whitespace-pre-wrap ${
                    mine
                      ? "bg-[color:var(--brand)] text-white"
                      : "bg-white border border-[color:var(--line)]"
                  }`}
                >
                  {m.body}
                  <div className={`text-[0.7rem] mt-1 ${mine ? "text-white/70" : "muted"}`}>
                    {relativeTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form action={sendMessage} className="flex gap-2 p-3 border-t border-[color:var(--line)]">
          <input type="hidden" name="conversation_id" value={id} />
          <input
            className="input"
            name="body"
            placeholder="Write a message…"
            maxLength={2000}
            autoComplete="off"
            aria-label="Message"
            data-testid="message-input"
          />
          <button className="btn btn-primary" type="submit" data-testid="send-message">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
