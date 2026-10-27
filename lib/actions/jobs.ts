"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "../auth";
import { db, ensureSchema, uuid } from "../db";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];

export async function createJob(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const company = String(formData.get("company") ?? "").trim().slice(0, 120);
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const type = String(formData.get("type") ?? "Full-time");
  const salary = String(formData.get("salary") ?? "").trim().slice(0, 60);
  const description = String(formData.get("description") ?? "").trim().slice(0, 8000);

  if (!title || !company || !location || description.length < 20) {
    redirect("/jobs/post?error=fields");
  }

  const id = uuid();
  await db()
    .prepare(
      "INSERT INTO jobs (id, poster_id, title, company, location, type, salary, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(id, user.id, title, company, location, JOB_TYPES.includes(type) ? type : "Full-time", salary || null, description, Date.now())
    .run();
  revalidatePath("/jobs");
  redirect(`/jobs/${id}`);
}

export async function applyToJob(formData: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  await ensureSchema();
  const jobId = String(formData.get("job_id") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1500);

  const job = await db().prepare("SELECT id, poster_id FROM jobs WHERE id = ?").bind(jobId).first<{ id: string; poster_id: string }>();
  if (!job) redirect("/jobs");
  if (job.poster_id === user.id) redirect(`/jobs/${jobId}?error=self`);

  await db()
    .prepare(
      "INSERT INTO applications (id, job_id, user_id, note, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (job_id, user_id) DO NOTHING",
    )
    .bind(uuid(), jobId, user.id, note || null, Date.now())
    .run();
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?applied=1`);
}
