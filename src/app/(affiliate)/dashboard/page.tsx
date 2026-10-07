"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, ShoppingBag, Wallet } from "lucide-react";
import { AmountTile } from "@/components/ui/AmountTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TrendChart } from "@/components/charts/TrendChart";
import { fetchAffiliateEarnings, type AffiliateEarning } from "@/lib/api";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

const RANGES = ["Today", "7 Days", "30 Days", "90 Days"] as const;
type Range = (typeof RANGES)[number];

function startForRange(range: Range): number {
  // "Today" means since midnight. Deriving it from a day count gave
  // `now - 0`, so the range started at this instant and nothing ever fell in it.
  if (range === "Today") {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return midnight.getTime();
  }
  const days = range === "7 Days" ? 7 : range === "30 Days" ? 30 : 90;
  return Date.now() - days * 86_400_000;
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("30 Days");
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAffiliateEarnings()
      .then(({ earnings: rows }) => setEarnings(rows))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load your earnings."))
      .finally(() => setLoading(false));
  }, []);

  // A row with no date cannot be placed in a time range; counting it in every
  // range made each one overstate, and made "Today" show only those rows.
  const visible = useMemo(
    () => earnings.filter((row) => row.occurredAt && new Date(row.occurredAt).getTime() >= startForRange(range)),
    [earnings, range],
  );
  const undated = useMemo(() => earnings.filter((row) => !row.occurredAt).length, [earnings]);
  // A reversed earning is an order that was cancelled or refunded. It is not a
  // sale and it is not money, so it stays out of every total below and is
  // reported on its own instead of quietly padding the figures.
  const active = useMemo(() => visible.filter((row) => row.status !== "reversed"), [visible]);
  const reversed = useMemo(
    () => visible.filter((row) => row.status === "reversed").reduce((sum, row) => sum + row.earning, 0),
    [visible],
  );
  // The currency the store actually reported, rather than assuming naira.
  const currency = useMemo(() => earnings.find((row) => row.currency)?.currency ?? null, [earnings]);
  const totals = useMemo(() => ({
    sales: active.length,
    commissions: active.reduce((sum, row) => sum + row.earning, 0),
    orderValue: active.length ? active.reduce((sum, row) => sum + row.amountTotal, 0) / active.length : 0,
  }), [active]);
  // A confirmed sale is money earned. "pending" and "approved" are the old
  // words for it and may still arrive on rows recorded before the change.
  const breakdown = useMemo(() => active.reduce((result, row) => {
    if (row.status === "paid") result.paid += row.earning;
    else result.earned += row.earning;
    return result;
  }, { earned: 0, paid: 0 }), [active]);
  const trend = useMemo(() => {
    const points = new Map<string, { date: string; sales: number; commissions: number }>();
    active.forEach((row) => {
      const date = row.occurredAt?.slice(0, 10);
      if (!date) return;
      const point = points.get(date) ?? { date, sales: 0, commissions: 0 };
      point.sales += 1;
      point.commissions += row.earning;
      points.set(date, point);
    });
    return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [active]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Your affiliate activity from backend-recorded earnings.</p>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-surface p-1">
          {RANGES.map((item) => <button key={item} onClick={() => setRange(item)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors", range === item ? "bg-accent text-black" : "text-muted hover:bg-surface-2 hover:text-foreground")}>{item}</button>)}
        </div>
      </div>
      {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Recorded Sales"
          value={loading ? "..." : formatNumber(totals.sales)}
          icon={ShoppingBag}
          info="How many paid orders came through your links in this period. Cancelled and refunded orders are not counted."
        />
        <StatTile
          label="Earnings"
          value={loading ? "..." : formatCurrency(totals.commissions, currency)}
          icon={Wallet}
          tone="up"
          info="Your share of those orders added up — the markup you set, on everything those shoppers bought. It is what you earned, not what has been paid to you."
        />
        <StatTile
          label="Avg. Order Value"
          value={loading ? "..." : formatCurrency(totals.orderValue, currency)}
          icon={Banknote}
          info="What a customer spends per order on average, including your markup. This is the shopper's total, not your earning."
        />
      </div>
      <Card>
        <CardHeader title="Sales & Earnings" subtitle={`Backend records over the last ${range.toLowerCase()}`} />
        <div className="p-2 sm:p-4">{trend.length ? <TrendChart data={trend} lines={[{ key: "sales", color: "#22c55e", name: "Sales", axis: "left" }, { key: "commissions", color: "#c154e8", name: "Earnings", axis: "right", format: "currency" }]} /> : <p className="p-8 text-center text-sm text-muted">No earning records for this period.</p>}</div>
      </Card>
      <Card>
        <CardHeader title="Earnings Status" subtitle="Based on backend-reported earning records" />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <AmountTile
            label="Earned"
            amount={breakdown.earned}
            tone="approved"
            currency={currency}
            info="Money from orders the store has confirmed as paid. It is yours; request a payout from the Earnings page once it reaches the minimum."
          />
          <AmountTile
            label="Reversed"
            amount={reversed}
            tone="reversed"
            currency={currency}
            info="From orders later cancelled or refunded. That money never arrived, so it is left out of every other figure."
          />
          <AmountTile
            label="Paid"
            amount={breakdown.paid}
            tone="paid"
            currency={currency}
            info="Already transferred to your bank account. This money has left CyberVilla."
            note={breakdown.paid ? undefined : "Nothing paid out yet."}
          />
        </div>
        {undated > 0 && (
          <div className="space-y-1 border-t border-border px-4 py-3 text-xs text-muted sm:px-5">
            {undated > 0 && (
              <p>
                {undated} earning{undated === 1 ? "" : "s"} without a date can&apos;t be placed in a time range
                — see the Earnings page for the full list.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

