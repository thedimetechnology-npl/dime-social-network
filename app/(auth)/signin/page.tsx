import Link from "next/link";
import { redirect } from "next/navigation";
import { signin } from "@/lib/actions/auth";
import { currentUser } from "@/lib/auth";
import { OAuthButtons } from "@/components/OAuthButtons";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Incorrect email or password.",
  provider: "That sign-in provider isn’t available or isn’t configured.",
  state: "The sign-in session expired. Please try again.",
  exchange: "The provider rejected the sign-in. Please try again.",
  profile: "The provider didn’t return your email address.",
  internal: "Something went wrong signing you in. Please try again.",
};

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? "Something went wrong." : null;

  return (
    <div className="sc-auth-card">
      <h1 className="text-2xl font-bold mb-1">Sign in</h1>
      <p className="muted small mb-5">Stay connected to your professional world.</p>

      {message && (
        <div className="alert alert-error" role="alert" data-testid="auth-error">
          {message}
        </div>
      )}

      <form action={signin} className="flex flex-col gap-4" data-testid="signin-form">
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
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>
        <div className="flex items-center justify-between">
          <Link href="/forgot-password" className="link small">
            Forgot password?
          </Link>
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          Sign in
        </button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <hr className="soft flex-1 m-0!" />
        <span className="small muted">or</span>
        <hr className="soft flex-1 m-0!" />
      </div>

      <OAuthButtons />

      <p className="text-center small muted mt-5">
        New to Dime Social Network?{" "}
        <Link href="/signup" className="link">
          Join now
        </Link>
      </p>
    </div>
  );
}
