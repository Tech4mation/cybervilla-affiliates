"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, Gift, Share2, ShoppingBag, UserPlus, Users } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { fetchReferrals, type ReferralSummary } from "@/lib/api";
import { cn, copyToClipboard, formatCurrency, formatDate } from "@/lib/utils";

/**
 * Invite other marketers, and see what they have earned you.
 *
 * Shows the inviter what each recruit's sales earned *them* — never what the
 * recruit earned. The bonus is paid only on completed sales, so the page
 * says plainly that a sign-up alone is worth nothing: the goal is affiliates
 * who sell, not more sign-ups.
 */

type CopyState = "idle" | "copied" | "failed";

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for approval",
  approved: "Active",
  rejected: "Not accepted",
  suspended: "Suspended",
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [state, setState] = useState<CopyState>("idle");
  async function copy() {
    const ok = await copyToClipboard(value);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), ok ? 1500 : 4000);
  }
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-sm text-foreground">{value}</code>
        <button
          onClick={copy}
          title={state === "failed" ? "Select the text and press Ctrl+C" : "Copy"}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
            state === "failed"
              ? "border-danger text-danger"
              : "border-border text-muted hover:bg-surface hover:text-foreground",
          )}
        >
          {state === "copied" ? <Check size={13} className="text-success" /> : state === "failed" ? <AlertCircle size={13} /> : <Copy size={13} />}
          {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function InvitePage() {
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferrals()
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load your invites."));
  }, []);

  if (error) {
    return <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>;
  }
  if (!data) return <div className="p-8 text-center text-sm text-muted">Loading your invites…</div>;

  // Only reached in the browser (the data loads client-side), so window and
  // navigator are there. Built from wherever the dashboard is being viewed,
  // so the link is right on every address it is served from.
  const link = data.code ? `${window.location.origin}/signup?ref=${encodeURIComponent(data.code)}` : "";
  const canShare = typeof navigator.share === "function";

  const rate = `${data.ratePercent.toLocaleString("en-NG", { maximumFractionDigits: 2 })}%`;
  const share = () =>
    navigator
      .share({
        title: "Join the CyberVilla affiliate programme",
        text: `Sell CyberVilla products and earn. Sign up with my invite code ${data.code}.`,
        url: link,
      })
      .catch(() => undefined);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Know other marketers? Invite them. You earn{" "}
        <strong className="font-medium text-foreground">{rate} of every completed order</strong> made
        by people who sign up with your code, on top of what they earn. Nothing is paid for sign-ups
        alone — only for real sales.
      </p>

      <Card>
        <CardHeader title="Your invite" subtitle="Share the link, or give people the code to type in when they sign up." />
        <div className="space-y-4 p-4 sm:p-5">
          {data.code ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <CopyField label="Invite link" value={link} />
                <CopyField label="Invite code" value={data.code} />
              </div>
              {canShare && (
                <button
                  onClick={share}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90"
                >
                  <Share2 size={15} /> Share invite
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Your invite code appears here once your account is approved.</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Invited" value={String(data.totals.recruits)} icon={UserPlus}
          info="Everyone who signed up with your code, approved or not." />
        <StatTile label="Active" value={String(data.totals.active)} icon={Users}
          info="Invited people who are approved members and can sell." />
        <StatTile label="Their sales" value={String(data.totals.sales)} icon={ShoppingBag}
          info="Completed orders made by the people you invited. Cancelled orders are not counted." />
        <StatTile label="Bonus earned" value={formatCurrency(data.totals.bonusEarned)} icon={Gift}
          info="Your referral bonus so far. It joins your balance and is paid with your other earnings." />
      </div>

      <Card>
        <CardHeader title="People you invited" />
        {data.recruits.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-foreground">Nobody has signed up with your code yet.</p>
            <p className="mt-1 text-xs text-muted">When someone does, they appear here with what their sales earn you.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Sales</th>
                  <th className="px-4 py-2.5 text-right font-medium">Earned you</th>
                </tr>
              </thead>
              <tbody>
                {data.recruits.map((r) => (
                  <tr key={r.affiliateId ?? r.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted">{r.joinedAt ? formatDate(r.joinedAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge status={r.status}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{r.sales}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                      {formatCurrency(r.bonusEarned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
