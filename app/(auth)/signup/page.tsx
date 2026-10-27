import Link from "next/link";
import { redirect } from "next/navigation";
import { signup } from "@/lib/actions/auth";
import { currentUser } from "@/lib/auth";
import { OAuthButtons } from "@/components/OAuthButtons";

const ERROR_MESSAGES: Record<string, string> = {
  name: "Please enter your name.",
  email: "Please enter a valid email address.",
  password: "Password must be at least 8 characters.",
  exists: "An account with this email already exists — sign in instead.",
};

export const metadata = { title: "Join Dime Social Network" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? "Something went wrong." : null;

  return (
    <div className="sc-auth-card">
      <h1 className="text-2xl font-bold mb-1">Join Dime Social Network</h1>
      <p className="muted small mb-5">Build your profile, find opportunities, connect.</p>

      {message && (
        <div className="alert alert-error" role="alert" data-testid="auth-error">
          {message}
        </div>
      )}

      <form action={signup} className="flex flex-col gap-4" data-testid="signup-form">
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            className="input"
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            placeholder="Jordan Rivera"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          Agree &amp; Join
        </button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <hr className="soft flex-1 m-0!" />
        <span className="small muted">or</span>
        <hr className="soft flex-1 m-0!" />
      </div>

      <OAuthButtons />

      <p className="text-center small muted mt-5">
        Already on Dime Social Network?{" "}
        <Link href="/signin" className="link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
