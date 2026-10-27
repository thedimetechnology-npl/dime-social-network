"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";

const MENU = [
  { href: "/", label: "Newsfeed" },
  { href: "/mynetwork", label: "My Network" },
  { href: "/messaging", label: "Messages" },
  { href: "/jobs", label: "Jobs" },
  { href: "/search", label: "Discover" },
];

export function LeftSidebar({
  user,
  connectionCount,
  postCount,
  pendingCount,
  unreadCount,
  completion,
}: {
  user: { id: string; name: string; headline: string | null; avatar_key: string | null };
  connectionCount: number;
  postCount: number;
  pendingCount: number;
  unreadCount: number;
  completion: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sc-rail" data-testid="left-rail">
      <div className="sc-profile-card">
        <div className="sc-profile-cover" />
        <div className="sc-profile-body">
          <Link href={`/profile/${user.id}`} className="sc-profile-avatar">
            <Avatar name={user.name} srcKey={user.avatar_key} size={58} />
          </Link>
          <Link href={`/profile/${user.id}`} className="sc-profile-name">
            {user.name}
          </Link>
          <span className="sc-profile-headline">{user.headline || "Add a headline to get noticed"}</span>

          <div className="sc-profile-stats">
            <div className="sc-stat">
              <span className="sc-stat-value">{connectionCount}</span>
              <span className="sc-stat-label">Connections</span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-value">{postCount}</span>
              <span className="sc-stat-label">Posts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <nav className="sc-menu">
          {MENU.map((item) => {
            const badge =
              item.href === "/mynetwork" ? pendingCount : item.href === "/messaging" ? unreadCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sc-menu-item ${isActive(item.href) ? "sc-menu-item--active" : ""}`}
                data-testid={`rail-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="flex items-center gap-2">
                  <span className="sc-menu-dot" />
                  {item.label}
                </span>
                {badge > 0 && <span className="badge-dot">{badge > 99 ? "99+" : badge}</span>}
              </Link>
            );
          })}
        </nav>

        <hr className="soft" />

        <Link href="/profile/edit" className="sc-menu-item">
          <span className="flex items-center gap-2">
            <span className="sc-menu-dot" />
            Edit profile
          </span>
        </Link>

        <div className="mt-3">
          <div className="flex items-center justify-between small muted mb-1">
            <span>Profile strength</span>
            <span className="font-bold text-[color:var(--brand)]">{completion}%</span>
          </div>
          <div className="sc-progress">
            <div className="sc-progress-bar" style={{ width: `${completion}%` }} />
          </div>
          {completion < 100 && (
            <p className="small muted mt-2 mb-0">
              Add a headline, summary, location and photo to be discovered by more people.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
