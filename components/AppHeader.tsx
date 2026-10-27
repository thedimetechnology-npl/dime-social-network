"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signout } from "@/lib/actions/auth";
import { Avatar } from "./Avatar";

const NavItemIcon = {
  House: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="15" y1="3" x2="21" y2="21"/></svg>`,
  Users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><circle cx="20" cy="9" r="3"/><circle cx="2" cy="20" r="3"/><circle cx="9" cy="20" r="3"/><circle cx="20" cy="20" r="3"/></svg>`,
  Message: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 7s-1.9-5-5-5S5 2 5 2s1.9 5 5 5m0 4s-1.9-5-5-5S5 6 5 6s1.9 5 5 5m-7 8c1.9 0 3.8-0.5 5.5-1.5 2.3-1.3 4-3 5.5-5.5A11.955 11.955 0 0 1 12 20c-1.4 0-2.7-0.5-3.8-1.5z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/><path d="M6 9l-2 2m4 0l2 2m-8-8l2-2m-4 0l2-2"/></svg>`,
  Briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M16 3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="21" x2="21" y2="21"/></svg>`,
};

interface NavItem {
  href: string;
  label: string;
  badge?: number;
  icon: keyof typeof NavItemIcon;
}

export function AppHeader({
  user,
  pendingCount,
  unreadCount,
}: {
  user: { id: string; name: string; avatar_key: string | null };
  pendingCount: number;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links: NavItem[] = [
    { href: "/", label: "Feed", icon: "House" },
    { href: "/mynetwork", label: "My Network", badge: pendingCount, icon: "Users" },
    { href: "/messaging", label: "Messaging", badge: unreadCount, icon: "Message" },
    { href: "/jobs", label: "Jobs", icon: "Briefcase" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const navLinks = () =>
    links.map((l) => (
      <Link
        key={l.href}
        href={l.href}
        className={`socimo-nav-link ${isActive(l.href) ? "socimo-nav-link--active" : ""}`}
        onClick={() => setOpen(false)}
        data-testid={`nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <span className="socimo-nav-icon">{NavItemIcon[l.icon]}</span>
        {l.label}
        {!!l.badge && <span className="socimo-nav-badge">{l.badge > 99 ? "99+" : l.badge}</span>}
      </Link>
    ));

  const searchField = (
    <form action="/search" method="get" className="socimo-search-form">
      <button type="submit" className="socimo-search-submit" aria-label="Search">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      <input
        className="socimo-search-input"
        type="search"
        name="q"
        placeholder="Search people, jobs and posts…"
        aria-label="Search"
        data-testid="header-search"
        autoComplete="off"
      />
    </form>
  );

  return (
    <header className="socimo-header">
      <div className="mx-auto max-w-[1280px] px-3 sm:px-4">
        <div className="sc-header-inner">
          <Link href="/" className="socimo-brand-link" aria-label="Dime Social Network home">
            <span className="socimo-brand-avatar">D</span>
            <span className="socimo-brand-text hidden sm:inline">Dime</span>
          </Link>

          <div className="socimo-search-wrapper">{searchField}</div>

          <nav className="socimo-nav">{navLinks()}</nav>

          <div className="socimo-user-menu">
            <Link href={`/profile/${user.id}`} className="socimo-user-profile">
              <Avatar name={user.name} srcKey={user.avatar_key} size={32} />
              <span className="hidden xl:inline text-[0.8rem] font-semibold text-[color:var(--ink)]">
                {user.name.split(" ")[0]}
              </span>
            </Link>
            <form action={signout}>
              <button className="socimo-signout-btn" type="submit">
                Sign out
              </button>
            </form>
          </div>

          <button
            className="socimo-menu-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
            data-testid="mobile-menu-toggle"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {open && (
          <div className="socimo-mobile-menu" data-testid="mobile-menu">
            {searchField}
            <nav className="socimo-mobile-nav">{navLinks()}</nav>
            <div className="socimo-mobile-footer">
              <Link
                href={`/profile/${user.id}`}
                className="socimo-mobile-profile"
                onClick={() => setOpen(false)}
              >
                <Avatar name={user.name} srcKey={user.avatar_key} size={30} />
                <span className="font-semibold text-sm">View profile</span>
              </Link>
              <form action={signout}>
                <button className="socimo-mobile-signout" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
