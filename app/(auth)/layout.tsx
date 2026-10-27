import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="sc-auth-brand">
        <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-12">
          <Link href="/signin" className="inline-flex items-center gap-2.5 no-underline">
            <span className="socimo-brand-avatar">D</span>
            <span className="text-xl font-bold text-white">Dime Social Network</span>
          </Link>

          <div className="hidden lg:block">
            <h2 className="text-3xl font-bold text-white leading-tight max-w-sm">
              Where professionals meet, share and grow.
            </h2>
            <p className="mt-3 text-sm max-w-sm" style={{ color: "rgba(255,255,255,0.86)" }}>
              Build a profile that works for you, follow the people who inspire you, and find your next
              opportunity - all in one place.
            </p>

            <ul className="mt-7 flex flex-col gap-3 text-sm" style={{ color: "rgba(255,255,255,0.94)" }}>
              <li className="flex items-center gap-2.5">
                <span className="sc-auth-tick">✓</span> A living feed of your network
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sc-auth-tick">✓</span> Connections, messages and job openings
              </li>
              <li className="flex items-center gap-2.5">
                <span className="sc-auth-tick">✓</span> A profile you can share anywhere
              </li>
            </ul>
          </div>

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            © 2025 Dime Social Network. All rights reserved.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
