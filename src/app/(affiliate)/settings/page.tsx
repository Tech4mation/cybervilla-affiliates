"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getCurrentUser, type AuthUser } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentUser()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load your account."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading account settings...</p>;
  if (error || !user) return <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error ?? "Account details are unavailable."}</p>;

  const initials = user.name.split(" ").map((part) => part[0]).join("");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Profile" subtitle="Your account information from the affiliate backend." />
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-xl font-semibold text-white">{initials}</span>
          <div>
            <p className="text-base font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge status={user.status}>{user.status}</Badge>
              {user.affiliateId && <span className="text-xs text-muted">Affiliate ID: {user.affiliateId}</span>}
              {user.createdAt && <span className="text-xs text-muted">Joined {formatDate(user.createdAt)}</span>}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Personal information" subtitle="These values are currently read-only because the backend has no profile update endpoint." />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <ReadOnlyField label="Full name" value={user.name} />
          <ReadOnlyField label="Email address" value={user.email} />
          <ReadOnlyField label="Phone number" value={user.phone || "Not provided"} />
          <ReadOnlyField label="Account role" value={user.role} />
          <ReadOnlyField label="Membership status" value={user.status} />
          <ReadOnlyField label="Promotional channel" value={user.promotionalChannel || "Not provided"} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Account capabilities" subtitle="Only backend-supported account actions are shown." />
        <div className="space-y-2 p-4 text-sm text-muted sm:p-5">
          <p>Password changes are not available because the backend does not expose a password-update endpoint.</p>
          <p>Notification preferences are not available because the backend does not persist notification settings.</p>
        </div>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground">{value}</div>
    </div>
  );
}
