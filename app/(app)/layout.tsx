import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { emailDeliveryEnabled } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/signin");

  await ensureSchema();
  const conn = db();

  const [pending, unread, connections, posts, suggestions, jobs] = await Promise.all([
    conn
      .prepare("SELECT COUNT(*) AS c FROM connections WHERE addressee_id = ? AND status = 'pending'")
      .bind(user.id)
      .first<{ c: number }>(),
    conn
      .prepare(
        `SELECT COUNT(*) AS c FROM messages
          WHERE sender_id <> ? AND read_at IS NULL
            AND conversation_id IN (SELECT id FROM conversations WHERE user_low = ? OR user_high = ?)`,
      )
      .bind(user.id, user.id, user.id)
      .first<{ c: number }>(),
    conn
      .prepare(
        "SELECT COUNT(*) AS c FROM connections WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)",
      )
      .bind(user.id, user.id)
      .first<{ c: number }>(),
    conn.prepare("SELECT COUNT(*) AS c FROM posts WHERE author_id = ?").bind(user.id).first<{ c: number }>(),
    conn
      .prepare(
        `SELECT id, name, headline, avatar_key FROM users
          WHERE id <> ?
            AND id NOT IN (SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END
                             FROM connections WHERE requester_id = ? OR addressee_id = ?)
          ORDER BY created_at DESC LIMIT 4`,
      )
      .bind(user.id, user.id, user.id, user.id)
      .all<{ id: string; name: string; headline: string | null; avatar_key: string | null }>(),
    conn
      .prepare(
        `SELECT j.id, j.title, j.company, j.location
           FROM jobs j
          ORDER BY j.created_at DESC
          LIMIT 3`,
      )
      .all<{ id: string; title: string; company: string; location: string }>(),
  ]);

  const completion = [user.headline, user.about, user.location, user.avatar_key].filter(Boolean).length * 25;

  let deliveryConfigured = false;
  try {
    deliveryConfigured = emailDeliveryEnabled();
  } catch {
    deliveryConfigured = false;
  }
  const needsVerification = user.verified === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={{ id: user.id, name: user.name, avatar_key: user.avatar_key }}
        pendingCount={pending?.c ?? 0}
        unreadCount={unread?.c ?? 0}
      />

      {needsVerification && deliveryConfigured && (
        <div className="sc-verify-bar">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm">
            ⚠️ Your email isn&apos;t verified yet — we sent you a confirmation link (valid 24 hours).
          </div>
        </div>
      )}

      <main className="flex-1 w-full mx-auto max-w-[1280px] px-3 sm:px-4 py-5">
        <div className="sc-shell">
          <LeftSidebar
            user={{
              id: user.id,
              name: user.name,
              headline: user.headline,
              avatar_key: user.avatar_key,
            }}
            connectionCount={connections?.c ?? 0}
            postCount={posts?.c ?? 0}
            pendingCount={pending?.c ?? 0}
            unreadCount={unread?.c ?? 0}
            completion={completion}
          />

          <div className="min-w-0">{children}</div>

          <RightSidebar suggestions={suggestions.results} jobs={jobs.results} />
        </div>
      </main>

      <footer className="sc-page-footer">
        <div className="mx-auto max-w-[1280px] px-4 py-4 small muted">
          © 2025 Dime Social Network · Professional networking for everyone
        </div>
      </footer>
    </div>
  );
}
