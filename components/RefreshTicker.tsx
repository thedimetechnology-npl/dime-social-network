"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Polls router.refresh() so server-rendered pages (messages, feed) pick up new data. */
export function RefreshTicker({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
