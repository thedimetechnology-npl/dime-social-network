import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPassword } from "@/lib/actions/auth";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  if (await currentUser()) redirect("/");
  const { token, error } = await searchParams;

  const message =
    error === "password"
      ? "Passwords must be at least 8 characters and match."
      : error === "expired"
        ? "This reset link is invalid or has expired. Request a new one."
        : null;

  if (!token) {
    return (
      <div className="sc-auth-card">
        <h1 className="text-2xl font-bold mb-2">Set a new password</h1>
        <div className="alert alert-error" data-testid="auth-error">
          This reset link is missing or invalid. Request a new one.
        </div>
        <Link href="/forgot-password" className="btn btn-primary btn-block">
          Request reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="sc-auth-card">
      <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
      <p className="muted small mb-5">Choose a strong password you haven’t used here before.</p>

      {message && (
        <div className="alert alert-error" role="alert" data-testid="auth-error">
          {message}
        </div>
      )}

      <form action={resetPassword} className="flex flex-col gap-4" data-testid="reset-form">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="password">
            New password
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
        <div>
          <label className="label" htmlFor="confirm">
            Confirm new password
          </label>
          <input
            className="input"
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repeat the password"
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit">
          Update password
        </button>
      </form>
    </div>
  );
}
