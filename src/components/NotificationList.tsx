"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  CreditCard,
  Link2,
  Tag,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fetchNotifications, markNotificationsRead, type AppNotice } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

/** Icon by event, not by wording, so rephrasing a notice never changes it. */
const ICONS: Record<string, typeof Bell> = {
  "account.approved": UserCheck,
  "account.rejected": XCircle,
  "application.received": UserCheck,
  "earning.recorded": BadgeCheck,
  "earning.approved": BadgeCheck,
  "earning.reversed": XCircle,
  "payout.requested": CreditCard,
  "payout.paid": CreditCard,
  "payout.failed": AlertCircle,
  "link.broken": Link2,
  "campaign.started": Tag,
  "payout.otp_required": CreditCard,
};

const BAD = new Set(["account.rejected", "earning.reversed", "payout.failed", "link.broken"]);

export function NotificationList() {
  const [items, setItems] = useState<AppNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications()
      .then((page) => {
        setItems(page.notifications);
        setUnread(page.unread);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load your notifications."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function markAll() {
    const previous = items;
    // Shown as read straight away; put back if the server disagrees.
    setItems((rows) => rows.map((r) => ({ ...r, read: true })));
    setUnread(0);
    try {
      const result = await markNotificationsRead();
      setUnread(result.unread);
    } catch {
      setItems(previous);
      setError("We could not mark those as read.");
    }
  }

  async function markOne(notice: AppNotice) {
    if (notice.read) return;
    setItems((rows) => rows.map((r) => (r.id === notice.id ? { ...r, read: true } : r)));
    setUnread((n) => Math.max(0, n - 1));
    await markNotificationsRead([notice.id]).catch(() => undefined);
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading notifications…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {unread > 0 ? `${unread} unread` : "You're up to date"}
        </p>
        {unread > 0 && (
          <button onClick={markAll} className="text-xs font-medium text-accent hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      <Card>
        <ul className="divide-y divide-border">
          {items.length === 0 && (
            <li className="p-10 text-center text-sm text-muted">
              {error
                ? "Your notifications could not be loaded — see the message above."
                : "Nothing yet. You'll hear from us when an order comes in, an earning is approved, or a payout is sent."}
            </li>
          )}
          {items.map((notice) => {
            const Icon = ICONS[notice.kind] ?? Bell;
            const bad = BAD.has(notice.kind);
            const body = (
              <div
                className={cn(
                  "flex items-start gap-3 p-4 transition-colors hover:bg-surface-2 sm:p-5",
                  !notice.read && "bg-accent/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-lg p-2",
                    notice.read
                      ? "bg-surface-2 text-muted"
                      : bad
                        ? "bg-danger/10 text-danger"
                        : "bg-accent/10 text-accent",
                  )}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm text-foreground", !notice.read && "font-semibold")}>
                      {notice.title}
                    </p>
                    {!notice.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </div>
                  {notice.body && <p className="mt-0.5 text-xs text-muted">{notice.body}</p>}
                  {notice.createdAt && (
                    <p className="mt-1.5 text-[11px] text-muted">{timeAgo(notice.createdAt)}</p>
                  )}
                </div>
              </div>
            );

            return (
              <li key={notice.id}>
                {notice.href ? (
                  <Link href={notice.href} onClick={() => markOne(notice)} className="block">
                    {body}
                  </Link>
                ) : (
                  <button onClick={() => markOne(notice)} className="block w-full text-left">
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
