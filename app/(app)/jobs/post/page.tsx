import Link from "next/link";
import { createJob } from "@/lib/actions/jobs";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post a job" };

const TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];

export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = (await currentUser())!;
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/jobs" className="link small">
        ← All jobs
      </Link>

      <div className="card card-pad mt-3">
        <h1 className="text-xl font-bold mb-1">Post a job</h1>
        <p className="muted small mb-4">
          Reach professionals on Dime Social Network. You’ll see everyone who applies.
        </p>

        {error === "fields" && (
          <div className="alert alert-error" role="alert" data-testid="job-error">
            Please fill in title, company, location and a description of at least 20 characters.
          </div>
        )}

        <form action={createJob} className="flex flex-col gap-4" data-testid="job-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="title">
                Job title *
              </label>
              <input className="input" id="title" name="title" required maxLength={120} placeholder="Senior Product Designer" />
            </div>
            <div>
              <label className="label" htmlFor="company">
                Company *
              </label>
              <input className="input" id="company" name="company" required maxLength={120} placeholder="Acme Inc." />
            </div>
            <div>
              <label className="label" htmlFor="location">
                Location *
              </label>
              <input className="input" id="location" name="location" required maxLength={120} placeholder="Berlin / Remote" />
            </div>
            <div>
              <label className="label" htmlFor="type">
                Employment type
              </label>
              <select className="select" id="type" name="type" defaultValue="Full-time">
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="salary">
              Salary range (optional)
            </label>
            <input className="input" id="salary" name="salary" maxLength={60} placeholder="€70k – €90k" />
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description * (min. 20 characters)
            </label>
            <textarea
              className="textarea"
              id="description"
              name="description"
              rows={8}
              required
              minLength={20}
              maxLength={8000}
              placeholder="Responsibilities, requirements, benefits…"
              data-testid="job-description"
            />
          </div>

          <button className="btn btn-primary self-start" type="submit">
            Publish job
          </button>
        </form>
      </div>
    </div>
  );
}
