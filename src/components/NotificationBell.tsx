"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { fetchNotifications } from "@/lib/api";

/**
 * The bell, with a count of what hasn't been read.
 *
 * It re-checks on a timer because nothing pushes to the browser; a minute is
 * often enough for a dashboard somebody leaves open, and infrequent enough
 * not to matter. A failed check is ignored — a stale badge is not worth an
 * error in the corner of every page.
 */
export function NotificationBell({ href }: { href: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetchNotifications(1)
        .then((page) => {
          if (!cancelled) setUnread(page.unread);
        })
        .catch(() => undefined);
    void check();
    const timer = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href={href}
      className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Bell size={18} />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
