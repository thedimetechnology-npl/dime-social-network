import Link from "next/link";
import { notFound } from "next/navigation";
import { applyToJob } from "@/lib/actions/jobs";
import { Avatar } from "@/components/Avatar";
import { currentUser } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface JobDetail {
  id: string;
  poster_id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string | null;
  description: string;
  created_at: number;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const user = (await currentUser())!;
  const { id } = await params;
  const sp = await searchParams;
  await ensureSchema();

  const job = await db()
    .prepare(
      `SELECT j.id, j.poster_id, j.title, j.company, j.location, j.type, j.salary, j.description, j.created_at,
              u.name AS poster_name, u.headline AS poster_headline, u.avatar_key AS poster_avatar,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
         FROM jobs j JOIN users u ON u.id = j.poster_id
        WHERE j.id = ?`,
    )
    .bind(id)
    .first<JobDetail & { poster_name: string; poster_headline: string | null; poster_avatar: string | null; applicant_count: number }>();
  if (!job) notFound();

  const isPoster = job.poster_id === user.id;
  const myApplication = isPoster
    ? null
    : await db()
        .prepare("SELECT id, note, created_at FROM applications WHERE job_id = ? AND user_id = ?")
        .bind(id, user.id)
        .first<{ id: string; note: string | null; created_at: number }>();

  const applicants = isPoster
    ? await db()
        .prepare(
          `SELECT a.id AS application_id, a.note, a.created_at,
                  u.id AS user_id, u.name, u.headline, u.avatar_key, u.location
             FROM applications a JOIN users u ON u.id = a.user_id
            WHERE a.job_id = ?
            ORDER BY a.created_at DESC LIMIT 100`,
        )
        .bind(id)
        .all<{
          application_id: string;
          note: string | null;
          created_at: number;
          user_id: string;
          name: string;
          headline: string | null;
          avatar_key: string | null;
          location: string | null;
        }>()
    : null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <Link href="/jobs" className="link small">
        ← All jobs
      </Link>

      <div className="card card-pad">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold break-words">{job.title}</h1>
            <div className="text-sm muted break-words">
              {job.company} · {job.location}
            </div>
            <div className="small muted mt-1">
              {job.type}
              {job.salary ? ` · ${job.salary}` : ""} · posted {relativeTime(job.created_at)}
            </div>
          </div>
          <span className="badge-dot bg-[color:var(--brand)]! shrink-0" data-testid="applicant-count">
            {job.applicant_count}
          </span>
        </div>

        <hr className="soft" />

        <div className="flex items-center gap-3 mb-4">
          <Avatar name={job.poster_name} srcKey={job.poster_avatar} size={40} />
          <div className="min-w-0">
            <Link href={`/profile/${job.poster_id}`} className="font-semibold hover:underline">
              {job.poster_name}
            </Link>
            <div className="small muted truncate">{job.poster_headline || "Professional"}</div>
          </div>
        </div>

        <p className="whitespace-pre-wrap break-words">{job.description}</p>
      </div>

      {!isPoster && (
        <div className="card card-pad">
          {sp.applied && (
            <div className="alert alert-ok" role="status" data-testid="applied-notice">
              Application submitted — the poster can now see your profile and note.
            </div>
          )}
          {sp.error === "self" && (
            <div className="alert alert-error">
              You posted this job, so you can’t apply to it.
            </div>
          )}

          {myApplication ? (
            <div data-testid="already-applied">
              <p className="font-semibold mb-1">✓ You applied {relativeTime(myApplication.created_at)}</p>
              {myApplication.note && (
                <p className="muted small">Your note: “{myApplication.note}”</p>
              )}
            </div>
          ) : (
            <form action={applyToJob} className="flex flex-col gap-3">
              <input type="hidden" name="job_id" value={job.id} />
              <div>
                <label className="label" htmlFor="note">
                  Note to the poster (optional)
                </label>
                <textarea
                  className="textarea"
                  id="note"
                  name="note"
                  rows={3}
                  maxLength={1500}
                  placeholder="Why are you a great fit for this role?"
                  data-testid="apply-note"
                />
              </div>
              <button className="btn btn-primary self-start" type="submit" data-testid="apply-button">
                Apply
              </button>
            </form>
          )}
        </div>
      )}

      {isPoster && applicants && (
        <div className="card card-pad">
          <h2 className="section-title mb-3">Applicants ({applicants.results.length})</h2>
          {applicants.results.length === 0 ? (
            <p className="muted small" data-testid="no-applicants">
              No applications yet. Share this posting to get the word out.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {applicants.results.map((a) => (
                <div key={a.application_id} className="flex items-start gap-3" data-testid="applicant">
                  <Link href={`/profile/${a.user_id}`}>
                    <Avatar name={a.name} srcKey={a.avatar_key} size={44} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${a.user_id}`} className="font-semibold hover:underline">
                      {a.name}
                    </Link>
                    <div className="small muted break-words">
                      {a.headline || "Professional"}
                      {a.location ? ` · ${a.location}` : ""}
                    </div>
                    {a.note && <div className="text-sm mt-1 break-words">“{a.note}”</div>}
                    <div className="small muted mt-0.5">Applied {relativeTime(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
