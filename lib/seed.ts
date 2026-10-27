// Demo seed data — inserted once per cold start after the schema DDL.
// Provides a ready-to-browse social feed with no external database.
import type { D1Database } from "./cloudflare";

/** Pre-computed PBKDF2-SHA256 hash (600k iterations) for password: password123 */
const DEMO_PASSWORD_HASH =
  "pbkdf2-sha256$600000$825bt7LFgLBM0Y1YOM/pPA==$4ubxHRWZMW9TvmQFc6iVD7akAQNsYHEliPLsSzWSCKk=";

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const users = [
  // Primary demo account (sign in with testuser2@example.com / password123)
  {
    id: "u-demo",
    email: "testuser2@example.com",
    name: "Demo User",
    password_hash: DEMO_PASSWORD_HASH,
    headline: "Product Designer & Storyteller",
    about: "Designing thoughtful products and sharing what I learn along the way.",
    location: "Kathmandu, Nepal",
    avatar_key: null,
    verified: 1,
    created_at: now - 90 * DAY,
  },
  {
    id: "u-grace",
    email: "grace@example.com",
    name: "Grace Hopper",
    password_hash: null,
    headline: "Compiler Engineer & Teacher",
    about: "It is easier to ask forgiveness than it is to get permission.",
    location: "Arlington, VA",
    avatar_key: null,
    verified: 1,
    created_at: now - 400 * DAY,
  },
  {
    id: "u-ada",
    email: "ada@example.com",
    name: "Ada Lovelace",
    password_hash: null,
    headline: "Professional",
    about: "The Analytical Engine weaves algebraic patterns.",
    location: "London, UK",
    avatar_key: null,
    verified: 1,
    created_at: now - 350 * DAY,
  },
  {
    id: "u-alan",
    email: "alan@example.com",
    name: "Alan Turing",
    password_hash: null,
    headline: "Machine Learning Researcher",
    about: "Curious about intelligence in all its forms.",
    location: "Manchester, UK",
    avatar_key: null,
    verified: 1,
    created_at: now - 200 * DAY,
  },
  {
    id: "u-katherine",
    email: "katherine@example.com",
    name: "Katherine Johnson",
    password_hash: null,
    headline: "Mathematician & Orbital Mechanic",
    about: "Geometry. Trajectory. Launch.",
    location: "Hampton, VA",
    avatar_key: null,
    verified: 1,
    created_at: now - 150 * DAY,
  },
];

const posts = [
  {
    id: "p-1",
    author_id: "u-demo",
    body: "Socimo-inspired design is live 🎉 Excited to share the new feed experience with everyone here.",
    image_key: null,
    created_at: now - 17 * HOUR,
  },
  {
    id: "p-2",
    author_id: "u-ada",
    body: "The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves. #historyofcode",
    image_key: null,
    created_at: now - 20 * HOUR,
  },
  {
    id: "p-3",
    author_id: "u-grace",
    body: "Debugging is like being the detective in a crime movie where you are also the murderer. Shipping a fix today 🚀",
    image_key: null,
    created_at: now - 2 * DAY,
  },
  {
    id: "p-4",
    author_id: "u-alan",
    body: "Working on a new paper about imitation games and machine intelligence. Would love feedback from the community!",
    image_key: null,
    created_at: now - 3 * DAY,
  },
  {
    id: "p-5",
    author_id: "u-katherine",
    body: "Angle of attack confirmed. Never underestimate the power of precise math. 🛰️",
    image_key: null,
    created_at: now - 5 * DAY,
  },
];

const comments = [
  {
    id: "c-1",
    post_id: "p-1",
    author_id: "u-grace",
    body: "Design matches the Socimo reference beautifully.",
    created_at: now - 16 * HOUR,
  },
  {
    id: "c-2",
    post_id: "p-1",
    author_id: "u-ada",
    body: "Love the clean layout!",
    created_at: now - 15 * HOUR,
  },
  {
    id: "c-3",
    post_id: "p-3",
    author_id: "u-demo",
    body: "Ha! Classic debugging story. Good luck with the release.",
    created_at: now - 1 * DAY,
  },
  {
    id: "c-4",
    post_id: "p-4",
    author_id: "u-katherine",
    body: "Happy to review the draft — send it over.",
    created_at: now - 2 * DAY,
  },
];

const postLikes = [
  { post_id: "p-1", user_id: "u-demo", created_at: now - 17 * HOUR },
  { post_id: "p-1", user_id: "u-grace", created_at: now - 16 * HOUR },
  { post_id: "p-2", user_id: "u-demo", created_at: now - 19 * HOUR },
  { post_id: "p-2", user_id: "u-alan", created_at: now - 18 * HOUR },
  { post_id: "p-3", user_id: "u-demo", created_at: now - 2 * DAY },
  { post_id: "p-3", user_id: "u-ada", created_at: now - 2 * DAY },
  { post_id: "p-3", user_id: "u-katherine", created_at: now - 1 * DAY },
  { post_id: "p-4", user_id: "u-grace", created_at: now - 3 * DAY },
  { post_id: "p-5", user_id: "u-demo", created_at: now - 4 * DAY },
  { post_id: "p-5", user_id: "u-ada", created_at: now - 4 * DAY },
];

const connections = [
  // Demo user is connected with Grace and Ada
  { id: "cn-1", requester_id: "u-demo", addressee_id: "u-grace", status: "accepted", created_at: now - 60 * DAY },
  { id: "cn-2", requester_id: "u-demo", addressee_id: "u-ada", status: "accepted", created_at: now - 45 * DAY },
  { id: "cn-3", requester_id: "u-grace", addressee_id: "u-alan", status: "accepted", created_at: now - 100 * DAY },
  { id: "cn-4", requester_id: "u-ada", addressee_id: "u-katherine", status: "accepted", created_at: now - 80 * DAY },
  { id: "cn-5", requester_id: "u-alan", addressee_id: "u-katherine", status: "accepted", created_at: now - 70 * DAY },
  // Pending incoming request to demo user
  { id: "cn-6", requester_id: "u-katherine", addressee_id: "u-demo", status: "pending", created_at: now - 6 * HOUR },
  // Pending outgoing request from demo user
  { id: "cn-7", requester_id: "u-demo", addressee_id: "u-alan", status: "pending", created_at: now - 12 * HOUR },
];

const conversations = [
  { id: "cv-1", user_low: "u-ada", user_high: "u-demo", last_message_at: now - 3 * HOUR },
  { id: "cv-2", user_low: "u-demo", user_high: "u-grace", last_message_at: now - 30 * HOUR },
];

const messages = [
  { id: "m-1", conversation_id: "cv-1", sender_id: "u-demo", body: "Hey Ada! Loved your post about the Analytical Engine.", created_at: now - 5 * HOUR, read_at: now - 5 * HOUR },
  { id: "m-2", conversation_id: "cv-1", sender_id: "u-ada", body: "Thank you! It is fascinating to see how far we have come.", created_at: now - 4 * HOUR, read_at: now - 4 * HOUR },
  { id: "m-3", conversation_id: "cv-1", sender_id: "u-demo", body: "Would love to collaborate on a post sometime.", created_at: now - 3 * HOUR, read_at: null },
  { id: "m-4", conversation_id: "cv-2", sender_id: "u-grace", body: "Are you coming to the conference next week?", created_at: now - 31 * HOUR, read_at: now - 30 * HOUR },
  { id: "m-5", conversation_id: "cv-2", sender_id: "u-demo", body: "Wouldn't miss it! See you there.", created_at: now - 30 * HOUR, read_at: now - 30 * HOUR },
];

const jobs = [
  {
    id: "j-1",
    poster_id: "u-grace",
    title: "Contract Product Designer",
    company: "Dime Labs",
    location: "Remote",
    type: "Contract",
    salary: "$90k – $120k",
    description:
      "We are looking for a contract product designer to help shape our social networking experience. You will work closely with engineering and research to deliver polished, accessible interfaces.",
    created_at: now - 2 * DAY,
  },
  {
    id: "j-2",
    poster_id: "u-grace",
    title: "Contract Product Designer",
    company: "Dime Labs",
    location: "Remote (EU)",
    type: "Contract",
    salary: "€80k – €110k",
    description:
      "Join our EU team as a contract product designer. Focus on onboarding flows, feed engagement and messaging features.",
    created_at: now - 4 * DAY,
  },
  {
    id: "j-3",
    poster_id: "u-alan",
    title: "Machine Learning Engineer",
    company: "Turing Systems",
    location: "London, UK",
    type: "Full-time",
    salary: "£100k – £140k",
    description:
      "Build and deploy ML models powering recommendation and search. Strong Python and PyTorch skills required. Experience with large-scale data pipelines is a plus.",
    created_at: now - 7 * DAY,
  },
  {
    id: "j-4",
    poster_id: "u-katherine",
    title: "Frontend Engineer (Next.js)",
    company: "Orbit Digital",
    location: "Remote",
    type: "Full-time",
    salary: "$110k – $150k",
    description:
      "We are hiring a frontend engineer experienced with Next.js, React and TypeScript to build delightful consumer products from scratch.",
    created_at: now - 10 * DAY,
  },
  {
    id: "j-5",
    poster_id: "u-demo",
    title: "UX Research Intern",
    company: "Dime Labs",
    location: "Hybrid",
    type: "Internship",
    salary: "$25/hr",
    description:
      "Support user research for our social platform. Run interviews, synthesize findings and partner with design on improvements.",
    created_at: now - 1 * DAY,
  },
];

const applications = [
  { id: "ap-1", job_id: "j-3", user_id: "u-demo", note: "I have a strong ML background and love the mission.", created_at: now - 3 * DAY },
  { id: "ap-2", job_id: "j-4", user_id: "u-demo", note: "Next.js is my daily driver.", created_at: now - 6 * DAY },
  { id: "ap-3", job_id: "j-1", user_id: "u-alan", note: "Portfolio attached.", created_at: now - 1 * DAY },
  { id: "ap-4", job_id: "j-1", user_id: "u-katherine", note: "Excited about this role!", created_at: now - 1 * DAY },
];

/* Insert helpers --------------------------------------------------------- */

async function insertAll(db: D1Database, sql: string, rows: Record<string, unknown>[]): Promise<void> {
  for (const row of rows) {
    const values = Object.values(row);
    await db.prepare(sql).bind(...values).run();
  }
}

/** Seed demo data. Safe to run repeatedly thanks to primary keys / conflict-ignoring inserts. */
export async function seedDemoData(db: D1Database): Promise<void> {
  await insertAll(
    db,
    `INSERT OR IGNORE INTO users (id, email, name, password_hash, headline, about, location, avatar_key, verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    users as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO posts (id, author_id, body, image_key, created_at) VALUES (?, ?, ?, ?, ?)`,
    posts as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO comments (id, post_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
    comments as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)`,
    postLikes as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO connections (id, requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?, ?)`,
    connections as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO conversations (id, user_low, user_high, last_message_at) VALUES (?, ?, ?, ?)`,
    conversations as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO messages (id, conversation_id, sender_id, body, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?)`,
    messages as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO jobs (id, poster_id, title, company, location, type, salary, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    jobs as unknown as Record<string, unknown>[],
  );

  await insertAll(
    db,
    `INSERT OR IGNORE INTO applications (id, job_id, user_id, note, created_at) VALUES (?, ?, ?, ?, ?)`,
    applications as unknown as Record<string, unknown>[],
  );
}
