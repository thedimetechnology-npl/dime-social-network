import Link from "next/link";
import { connectRequest } from "@/lib/actions/social";
import { Avatar } from "./Avatar";

export function RightSidebar({
  suggestions,
  jobs,
}: {
  suggestions: { id: string; name: string; headline: string | null; avatar_key: string | null }[];
  jobs: { id: string; title: string; company: string; location: string }[];
}) {
  return (
    <aside className="sc-rail" data-testid="right-rail">
      <div className="card card-pad">
        <div className="sc-card-head">
          <h2 className="sc-card-title">People to follow</h2>
          <Link href="/mynetwork" className="sc-see-all">
            See all
          </Link>
        </div>

        {suggestions.length === 0 && (
          <p className="small muted mb-0">You&apos;re connected with everyone here. Nice.</p>
        )}

        {suggestions.map((p) => (
          <div key={p.id} className="sc-person">
            <Link href={`/profile/${p.id}`} className="shrink-0">
              <Avatar name={p.name} srcKey={p.avatar_key} size={36} />
            </Link>
            <div className="min-w-0">
              <Link href={`/profile/${p.id}`} className="sc-person-name truncate">
                {p.name}
              </Link>
              <span className="sc-person-meta truncate">{p.headline || "Professional"}</span>
            </div>
            <form action={connectRequest}>
              <input type="hidden" name="user_id" value={p.id} />
              <button className="sc-mini-btn" type="submit" data-testid="rail-connect">
                Follow
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <div className="sc-card-head">
          <h2 className="sc-card-title">Latest jobs</h2>
          <Link href="/jobs" className="sc-see-all">
            See all
          </Link>
        </div>

        {jobs.length === 0 && (
          <p className="small muted mb-0">
            No openings yet —{" "}
            <Link href="/jobs/post" className="link">
              post the first one
            </Link>
            .
          </p>
        )}

        {jobs.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="sc-job">
            <span className="sc-job-title">{j.title}</span>
            <span className="sc-job-meta">
              {j.company} · {j.location}
            </span>
          </Link>
        ))}
      </div>

      <div className="card card-pad">
        <div className="sc-footer-links">
          <Link href="/">Feed</Link>
          <Link href="/mynetwork">Network</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/jobs/post">Post a job</Link>
          <Link href="/messaging">Messages</Link>
          <Link href="/profile/edit">Settings</Link>
        </div>
        <p className="sc-copyright mb-0">
          © 2025 Dime Social Network. All rights reserved.
        </p>
      </div>
    </aside>
  );
}
