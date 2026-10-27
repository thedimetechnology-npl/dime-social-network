import Link from "next/link";
import { redirect } from "next/navigation";
import { forgotPassword } from "@/lib/actions/auth";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; devToken?: string }>;
}) {
  if (await currentUser()) redirect("/");
  const { sent, devToken } = await searchParams;

  return (
    <div className="sc-auth-card">
      <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
      <p className="muted small mb-5">
        Enter your email and we’ll send you a link to set a new password.
      </p>

      {sent && (
        <div className="alert alert-ok" role="alert" data-testid="sent-notice">
          If an account exists for that email, a reset link is on its way.
        </div>
      )}

      {devToken && (
        <div className="alert alert-info" data-testid="dev-reset-link">
          Email delivery isn’t configured, so here is your local reset link:{" "}
          <Link className="link" href={`/reset-password?token=${devToken}`}>
            Set a new password
          </Link>
        </div>
      )}

      <form action={forgotPassword} className="flex flex-col gap-4" data-testid="forgot-form">
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
        <button className="btn btn-primary btn-block" type="submit">
          Send reset link
        </button>
      </form>

      <p className="text-center small muted mt-5">
        Remembered it?{" "}
        <Link href="/signin" className="link">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
