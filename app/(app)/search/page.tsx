import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = (await currentUser())!;
  const { q = "" } = await searchParams;
  const query = q.trim();
  const like = `%${query}%`;
  await ensureSchema();

  const empty = query.length === 0;

  const [people, jobs, posts] = empty
    ? [{ results: [] }, { results: [] }, { results: [] }]
    : await Promise.all([
        db()
          .prepare(
            `SELECT id, name, headline, location, avatar_key FROM users
              WHERE id <> ? AND (name LIKE ? OR headline LIKE ? OR location LIKE ? OR email LIKE ?)
              LIMIT 20`,
          )
          .bind(user.id, like, like, like, like)
          .all<{ id: string; name: string; headline: string | null; location: string | null; avatar_key: string | null }>(),
        db()
          .prepare(
            `SELECT id, title, company, location, type, salary, created_at FROM jobs
              WHERE title LIKE ? OR company LIKE ? OR description LIKE ? OR location LIKE ?
              ORDER BY created_at DESC LIMIT 20`,
          )
          .bind(like, like, like, like)
          .all<{
            id: string;
            title: string;
            company: string;
            location: string;
            type: string;
            salary: string | null;
            created_at: number;
          }>(),
        db()
          .prepare(
            `SELECT p.id, p.body, p.created_at, u.id AS author_id, u.name AS author_name, u.avatar_key AS author_avatar
               FROM posts p JOIN users u ON u.id = p.author_id
              WHERE p.body LIKE ?
              ORDER BY p.created_at DESC LIMIT 20`,
          )
          .bind(like)
          .all<{
            id: string;
            body: string;
            created_at: number;
            author_id: string;
            author_name: string;
            author_avatar: string | null;
          }>(),
      ]);

  const hasResults =
    people.results.length > 0 || jobs.results.length > 0 || posts.results.length > 0;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div className="card card-pad">
        <form method="get" action="/search" className="flex gap-2">
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search people, jobs and posts…"
            aria-label="Search"
            autoFocus
            data-testid="search-input"
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
      </div>

      {empty && (
        <div className="card card-pad text-center" data-testid="search-empty">
          <p className="muted">Type a keyword to search Dime Social Network.</p>
        </div>
      )}

      {!empty && !hasResults && (
        <div className="card card-pad text-center" data-testid="search-empty">
          <p className="font-semibold mb-1">No results for “{query}”</p>
          <p className="muted small">Try a different keyword — or check spelling.</p>
        </div>
      )}

      {people.results.length > 0 && (
        <section>
          <h2 className="section-title mb-3">People ({people.results.length})</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {people.results.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className="card card-pad flex items-center gap-3 hover:shadow-sm block"
                data-testid="search-person"
              >
                <Avatar name={p.name} srcKey={p.avatar_key} size={44} />
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{p.name}</span>
                  <span className="block small muted truncate">{p.headline || "Professional"}</span>
                  {p.location && <span className="block small muted truncate">{p.location}</span>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {jobs.results.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Jobs ({jobs.results.length})</h2>
          <div className="flex flex-col gap-3">
            {jobs.results.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="card card-pad hover:shadow-sm block"
                data-testid="search-job"
              >
                <div className="font-semibold text-[color:var(--brand)]">{j.title}</div>
                <div className="text-sm">
                  {j.company} · {j.location}
                </div>
                <div className="small muted">
                  {j.type}
                  {j.salary ? ` · ${j.salary}` : ""} · {relativeTime(j.created_at)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.results.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Posts ({posts.results.length})</h2>
          <div className="flex flex-col gap-3">
            {posts.results.map((p) => (
              <div key={p.id} className="card card-pad" data-testid="search-post">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar name={p.author_name} srcKey={p.author_avatar} size={32} />
                  <Link href={`/profile/${p.author_id}`} className="font-semibold hover:underline">
                    {p.author_name}
                  </Link>
                  <span className="small muted">{relativeTime(p.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
