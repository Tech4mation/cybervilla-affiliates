"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AmountTile } from "@/components/ui/AmountTile";
import { fetchAffiliateEarnings, getCurrentUser, type AffiliateEarning } from "@/lib/api";
import { downloadFile, formatCurrency, formatDate, toCsv } from "@/lib/utils";

export default function EarningsPage() {
  const [user, setUser] = useState<{ name: string; id: string; email: string } | null>(null);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCurrentUser(), fetchAffiliateEarnings()])
      .then(([{ user }, { earnings }]) => {
        setUser({ name: user.name, id: String(user.id), email: user.email });
        setEarnings(earnings);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load your earnings."),
      )
      .finally(() => setLoading(false));
  }, []);

  const currency = useMemo(() => earnings.find((row) => row.currency)?.currency ?? null, [earnings]);

  // Each state is counted on its own. A reversed earning — an order that was
  // cancelled or refunded — is money that never arrives, so it is reported
  // apart from the rest rather than folded into a total.
  const breakdown = useMemo(
    () =>
      earnings.reduce(
        (acc, e) => {
          if (e.status === "pending") acc.pending += e.earning;
          else if (e.status === "approved" || e.status === "payable") acc.approved += e.earning;
          else if (e.status === "paid") acc.paid += e.earning;
          else if (e.status === "reversed") acc.reversed += e.earning;
          return acc;
        },
        { pending: 0, approved: 0, paid: 0, reversed: 0 },
      ),
    [earnings],
  );

  function exportStatement() {
    if (!user) return;
    const year = new Date().getFullYear();
    downloadFile(
      [
        "CyberVilla Affiliate Earnings Statement",
        `Affiliate: ${user.name} (${user.id})`,
        `Generated: ${new Date().toISOString().slice(0, 10)}`,
        "",
        `Paid:     ${formatCurrency(breakdown.paid, currency)}`,
        `Approved: ${formatCurrency(breakdown.approved, currency)}`,
        `Pending:  ${formatCurrency(breakdown.pending, currency)}`,
        `Reversed: ${formatCurrency(breakdown.reversed, currency)}`,
      ].join("\n"),
      `cybervilla-earnings-statement-${year}.txt`,
      "text/plain",
    );
  }

  function exportHistory() {
    downloadFile(
      toCsv(
        earnings.map((e) => ({
          order_ref: e.orderRef,
          date: e.occurredAt ?? "",
          currency: e.currency ?? "",
          amount_total: e.amountTotal,
          earning: e.earning,
          status: e.status,
        })),
      ),
      `cybervilla-earnings-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading earnings...</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">What you have earned, as the store has reported it.</p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error} — this is a loading problem, not an empty account.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AmountTile
          label="Pending"
          amount={breakdown.pending}
          tone="pending"
          currency={currency}
          note={breakdown.pending ? "Recorded from paid orders." : undefined}
        />
        <AmountTile
          label="Approved"
          amount={breakdown.approved}
          tone="approved"
          currency={currency}
          note={breakdown.approved ? undefined : "No approval step yet."}
        />
        <AmountTile
          label="Paid"
          amount={breakdown.paid}
          tone="paid"
          currency={currency}
          note={breakdown.paid ? undefined : "Payouts aren't available yet."}
        />
        <AmountTile
          label="Reversed"
          amount={breakdown.reversed}
          tone="reversed"
          currency={currency}
          note={breakdown.reversed ? "Cancelled or refunded orders." : undefined}
        />
      </div>

      <Card>
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <Info size={16} className="mt-0.5 shrink-0 text-muted" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Payouts are not available yet</p>
            <p className="text-xs text-muted">
              Earnings are recorded here as soon as the store reports a paid order, but paying them out is
              still being built. There is nothing to set up yet — when payouts open, you will be asked for
              your bank details then.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Earnings history"
          subtitle={`${earnings.length} recorded ${earnings.length === 1 ? "order" : "orders"}`}
          action={
            <button
              onClick={exportStatement}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
            >
              <FileText size={13} /> Earnings statement
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Order</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Earning</th>
                <th className="px-4 py-3 font-medium sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.orderRef} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground sm:px-5">{e.orderRef}</td>
                  <td className="px-4 py-3 text-muted">{e.occurredAt ? formatDate(e.occurredAt) : "—"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(e.amountTotal, e.currency)}</td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(e.earning, e.currency)}</td>
                  <td className="px-4 py-3 sm:pr-5">
                    <Badge status={e.status}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
              {earnings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    {error
                      ? "Your earnings could not be loaded — see the message above."
                      : "No earnings recorded yet. They appear here once a customer buys through your link."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {earnings.length > 0 && (
          <div className="flex justify-end border-t border-border p-3">
            <button
              onClick={exportHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
            >
              <Download size={13} /> Export history
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

