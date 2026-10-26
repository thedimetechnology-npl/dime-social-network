import { configuredProviders, providerLabel } from "@/lib/oauth";

export function OAuthButtons() {
  const providers = configuredProviders();

  if (providers.length === 0) {
    return (
      <div className="alert alert-info mb-0!">
        Social sign-in isn't configured yet. Add <strong>GOOGLE_CLIENT_ID</strong> /{" "}
        <strong>GOOGLE_CLIENT_SECRET</strong> or <strong>MICROSOFT_CLIENT_ID</strong> /{" "}
        <strong>MICROSOFT_CLIENT_SECRET</strong> in your site secrets to enable it.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Google: solid blue pill with white "G" icon */}
      {providers.includes("google") && (
        <button
          className="btn btn-block flex items-center justify-center gap-2 rounded-full py-3 px-8 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: "#1a73e8", color: "#fff" }}
        >
          <span className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fff", color: "#1a73e8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M2.8 7.1c-.5-.4-.9-.9-1.3-1.3a5.5 5.5 0 0 1 7.8-7.8c.5-.4.9-.9 1.3-1.3.4.5.9.9 1.3 1.3a5.5 5.5 0 0 1-7.8 7.8c-.4.5-.9.9-1.3 1.3z"/><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          </span>
          <span className="hidden sm:inline text-white">Continue with Google</span>
        </button>
      )}

      {/* Microsoft: bordered white pill with 4-square logo */}
      {providers.includes("microsoft") && (
        <button
          className="btn btn-block flex items-center justify-center gap-2 rounded-full py-3 px-8 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: "#fff", borderColor: "#333333", color: "#333333" }}
        >
          <span className="h-5 w-5 rounded-full flex items-center justify-center" style={{ border: "1px solid #333333" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><circle cx="8.5" cy="18" r="1.5"/><circle cx="15.5" cy="18" r="1.5"/></svg>
          </span>
          <span className="hidden sm:inline text-[color:var(--ink)]">Continue with Microsoft</span>
        </button>
      )}

      {/* Email: bordered white pill, text only */}
      <button
        className="btn btn-block flex items-center justify-center gap-2 rounded-full py-3 px-8 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ backgroundColor: "#fff", borderColor: "#333333", color: "#333333" }}
      >
        <span className="hidden sm:inline text-[color:var(--ink)]">Sign in with email</span>
      </button>
    </div>
  );
}