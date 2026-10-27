import Link from "next/link";
import {
  acceptRequest,
  connectRequest,
  ignoreRequest,
  removeConnection,
  startConversation,
  withdrawRequest,
} from "@/lib/actions/social";
import { Avatar } from "@/components/Avatar";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Network" };

interface PersonRow {
  connection_id: string;
  user_id: string;
  name: string;
  headline: string | null;
  avatar_key: string | null;
  location: string | null;
  created_at: number;
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = (await currentUser())!;
  const { q = "" } = await searchParams;
  const query = q.trim();
  const like = `%${query}%`;
  await ensureSchema();

  const [incoming, outgoing, established, discovery] = await Promise.all([
    db()
      .prepare(
        `SELECT c.id AS connection_id, c.created_at, u.id AS user_id, u.name, u.headline, u.avatar_key, u.location
           FROM connections c JOIN users u ON u.id = c.requester_id
          WHERE c.addressee_id = ? AND c.status = 'pending'
          ORDER BY c.created_at DESC LIMIT 30`,
      )
      .bind(user.id)
      .all<PersonRow>(),
    db()
      .prepare(
        `SELECT c.id AS connection_id, c.created_at, u.id AS user_id, u.name, u.headline, u.avatar_key, u.location
           FROM connections c JOIN users u ON u.id = c.addressee_id
          WHERE c.requester_id = ? AND c.status = 'pending'
          ORDER BY c.created_at DESC LIMIT 30`,
      )
      .bind(user.id)
      .all<PersonRow>(),
    db()
      .prepare(
        `SELECT c.id AS connection_id, c.created_at,
                u.id AS user_id, u.name, u.headline, u.avatar_key, u.location
           FROM connections c
           JOIN users u ON u.id = CASE WHEN c.requester_id = ? THEN c.addressee_id ELSE c.requester_id END
          WHERE c.status = 'accepted' AND (c.requester_id = ? OR c.addressee_id = ?)
          ORDER BY c.created_at DESC LIMIT 100`,
      )
      .bind(user.id, user.id, user.id)
      .all<PersonRow>(),
    db()
      .prepare(
        `SELECT id AS user_id, name, headline, avatar_key, location, created_at FROM users
          WHERE id <> ?
            AND id NOT IN (
              SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END
                FROM connections WHERE requester_id = ? OR addressee_id = ?
            )
            AND (? = '' OR name LIKE ? OR headline LIKE ? OR location LIKE ?)
          ORDER BY created_at DESC LIMIT 24`,
      )
      .bind(user.id, user.id, user.id, user.id, query, like, like, like)
      .all<PersonRow>(),
  ]);

  const PersonCard = ({ person, children }: { person: PersonRow; children?: React.ReactNode }) => (
    <div className="card card-pad flex flex-col items-center text-center gap-3" data-testid="person-card">
      <Link href={`/profile/${person.user_id}`}>
        <Avatar name={person.name} srcKey={person.avatar_key} size={64} />
      </Link>
      <div className="min-w-0">
        <Link href={`/profile/${person.user_id}`} className="font-semibold hover:underline break-words">
          {person.name}
        </Link>
        <div className="small muted break-words">{person.headline || "Professional"}</div>
        {person.location && <div className="small muted">{person.location}</div>}
      </div>
      <div className="flex flex-col gap-2 w-full">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="card card-pad">
        <form method="get" action="/mynetwork" className="flex gap-2">
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search people by name, headline or location"
            aria-label="Search people"
            data-testid="network-search"
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      </div>

      {incoming.results.length > 0 && (
        <section>
          <h2 className="section-title mb-3">
            Invitations ({incoming.results.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {incoming.results.map((p) => (
              <PersonCard key={p.connection_id} person={p}>
                <form action={acceptRequest} className="w-full">
                  <input type="hidden" name="id" value={p.connection_id} />
                  <button className="btn btn-primary btn-block btn-sm" type="submit" data-testid="accept-invite">
                    Accept
                  </button>
                </form>
                <form action={ignoreRequest} className="w-full">
                  <input type="hidden" name="id" value={p.connection_id} />
                  <button className="btn btn-outline btn-block btn-sm" type="submit">
                    Ignore
                  </button>
                </form>
                <span className="small muted">{relativeTime(p.created_at)}</span>
              </PersonCard>
            ))}
          </div>
        </section>
      )}

      {outgoing.results.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Sent invitations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {outgoing.results.map((p) => (
              <PersonCard key={p.connection_id} person={p}>
                <span className="small muted">Pending · {relativeTime(p.created_at)}</span>
                <form action={withdrawRequest} className="w-full">
                  <input type="hidden" name="id" value={p.connection_id} />
                  <button className="btn btn-outline btn-block btn-sm" type="submit" data-testid="withdraw-invite">
                    Withdraw
                  </button>
                </form>
              </PersonCard>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title mb-3">
          Your connections ({established.results.length})
        </h2>
        {established.results.length === 0 ? (
          <div className="card card-pad" data-testid="no-connections">
            <p className="muted text-sm">
              You haven’t connected with anyone yet — send an invitation below to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {established.results.map((p) => (
              <PersonCard key={p.connection_id} person={p}>
                <form action={startConversation} className="w-full">
                  <input type="hidden" name="user_id" value={p.user_id} />
                  <button className="btn btn-outline btn-block btn-sm" type="submit" data-testid="message-person">
                    Message
                  </button>
                </form>
                <form action={removeConnection} className="w-full">
                  <input type="hidden" name="id" value={p.connection_id} />
                  <button className="btn btn-ghost btn-block btn-sm" type="submit">
                    Remove
                  </button>
                </form>
              </PersonCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">
          {query ? `People matching “${query}”` : "People you may know"}
        </h2>
        {discovery.results.length === 0 ? (
          <div className="card card-pad">
            <p className="muted text-sm">
              No other professionals found{query ? ` for “${query}”` : ""} — try a different search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {discovery.results.map((p) => (
              <PersonCard key={p.user_id} person={p}>
                <form action={connectRequest} className="w-full">
                  <input type="hidden" name="user_id" value={p.user_id} />
                  <button className="btn btn-primary btn-block btn-sm" type="submit" data-testid="connect-person">
                    Connect
                  </button>
                </form>
              </PersonCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
