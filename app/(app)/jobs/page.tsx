import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jobs" };

const TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string | null;
  created_at: number;
  poster_name: string;
  applicant_count: number;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = (await currentUser())!;
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const type = TYPES.includes(sp.type ?? "") ? (sp.type as string) : "";
  const like = `%${query}%`;
  await ensureSchema();

  const jobs = await db()
    .prepare(
      `SELECT j.id, j.title, j.company, j.location, j.type, j.salary, j.created_at,
              u.name AS poster_name,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
         FROM jobs j
         JOIN users u ON u.id = j.poster_id
        WHERE (? = '' OR j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)
          AND (? = '' OR j.type = ?)
        ORDER BY j.created_at DESC
        LIMIT 50`,
    )
    .bind(query, like, like, like, type, type)
    .all<JobRow>();

  const myApplications = await db()
    .prepare(
      `SELECT job_id FROM applications WHERE user_id = ? AND job_id IN (SELECT id FROM jobs)`,
    )
    .bind(user.id)
    .all<{ job_id: string }>();
  const applied = new Set(myApplications.results.map((r) => r.job_id));

  return (
    <div className="flex flex-col gap-5">
      <div className="card card-pad">
        <div className="flex flex-col sm:flex-row gap-3">
          <form method="get" action="/jobs" className="flex-1 flex gap-2">
            <input
              className="input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search jobs by title, company or keyword"
              aria-label="Search jobs"
              data-testid="jobs-search"
            />
            <select
              className="select w-auto!"
              name="type"
              defaultValue={type}
              aria-label="Job type"
              data-testid="jobs-type"
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
          <Link href="/jobs/post" className="btn btn-outline self-start" data-testid="post-job-link">
            + Post a job
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="section-title">
          {query || type ? `Results (${jobs.results.length})` : `Latest jobs (${jobs.results.length})`}
        </h1>

        {jobs.results.length === 0 && (
          <div className="card card-pad text-center" data-testid="no-jobs">
            <p className="font-semibold mb-1">No jobs found</p>
            <p className="muted small">
              Try different keywords, or{" "}
              <Link href="/jobs/post" className="link">
                post the first role
              </Link>
              .
            </p>
          </div>
        )}

        {jobs.results.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="card card-pad flex items-start justify-between gap-4 hover:shadow-sm block"
            data-testid="job-row"
          >
            <div className="min-w-0">
              <div className="font-semibold text-[color:var(--brand)] break-words">{job.title}</div>
              <div className="text-sm break-words">
                {job.company} · {job.location}
              </div>
              <div className="small muted mt-1">
                {job.type}
                {job.salary ? ` · ${job.salary}` : ""} · posted {relativeTime(job.created_at)} by{" "}
                {job.poster_name}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="badge-dot bg-[color:var(--brand)]!">
                {job.applicant_count}
              </span>
              <div className="small muted mt-1">applicant{job.applicant_count === 1 ? "" : "s"}</div>
              {applied.has(job.id) && <div className="small font-semibold mt-1">Applied ✓</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
