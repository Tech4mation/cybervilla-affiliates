"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * There is no notification data anywhere yet — no table, no endpoint. Rather
 * than show an empty list that reads as "nothing has happened to you", this
 * says plainly that the feature is not built, and points at the pages that do
 * carry real information.
 */
export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="rounded-lg bg-surface-2 p-3 text-muted">
            <Bell size={20} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Notifications aren&apos;t available yet</p>
            <p className="max-w-md text-xs text-muted">
              Nothing is being sent to you here yet. Until this is built, your{" "}
              <Link href="/earnings" className="text-accent hover:underline">
                earnings
              </Link>{" "}
              and{" "}
              <Link href="/transactions" className="text-accent hover:underline">
                transactions
              </Link>{" "}
              pages show every order as soon as the store reports it.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
