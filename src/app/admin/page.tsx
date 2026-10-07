"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Users, Wallet } from "lucide-react";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AmountTile } from "@/components/ui/AmountTile";
import { fetchAdminAffiliates, fetchAdminEarnings, fetchProducts, type AdminEarning, type AdminAffiliateItem } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [affiliates, setAffiliates] = useState<AdminAffiliateItem[]>([]);
  const [affiliateTotal, setAffiliateTotal] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<AdminEarning[]>([]);
  const [totals, setTotals] = useState<Record<string, { count: number; earning: number }>>({});
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchAdminAffiliates(),
      fetchAdminEarnings(),
      fetchProducts({ perPage: 1 }),
    ]).then(([affiliatePage, earningPage, productPage]) => {
      setAffiliates(affiliatePage.affiliates);
      // The roster is paginated; `total` is the real count, `affiliates.length`
      // is only the first page.
      setAffiliateTotal(affiliatePage.total);
      setEarnings(earningPage.earnings);
      // Totals come from the database, not from summing the rows we were
      // handed — the list is capped, and summing it made the headline money
      // figures shrink as the platform grew.
      setTotals(earningPage.totalsByStatus ?? {});
      setProductCount(productPage.total);
    }).catch((reason) => {
      // Never fall through to zeros — a failed load must not read as "no money".
      setError(reason instanceof Error ? reason.message : "Could not load platform figures.");
    }).finally(() => setLoading(false));
  }, []);

  const sumOf = (...states: string[]) =>
    states.reduce((sum, state) => sum + (totals[state]?.earning ?? 0), 0);
  // "pending" and "approved" are the old words for earned; rows recorded
  // before the change may still carry them.
  const earned = sumOf("completed", "pending", "approved", "payable");
  const reversed = sumOf("reversed");
  const paid = sumOf("paid");
  const currency = earnings.find((row) => row.currency)?.currency ?? null;
  // Unknown until it loads, rather than a confident zero.
  const show = (value: string) => (loading ? "…" : error ? "—" : value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Live platform data reported by the affiliate backend.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error} — the figures below are not available, not zero.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Recorded Earnings"
          value={show(formatCurrency(earned + paid, currency))}
          icon={Wallet}
          tone="up"
          info="Everything affiliates have earned across the platform, paid and unpaid together. Earnings reversed by a cancellation or refund are left out."
        />
        <StatTile
          label="Owed to affiliates"
          value={show(formatCurrency(earned, currency))}
          icon={Wallet}
          info="Earned and not yet paid out. This is what affiliates can request from the Payouts page."
        />
        <StatTile
          label="Affiliates"
          value={show(formatNumber(affiliateTotal ?? 0))}
          icon={Users}
          info="Every affiliate account on record, at any status — pending applications and rejected ones included, not just the approved."
        />
        <StatTile
          label="Catalogue Products"
          value={show(formatNumber(productCount ?? 0))}
          icon={Package}
          info="How many products have been pulled in from the CyberVilla store and are available for affiliates to promote."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Affiliate applications" subtitle="Current records from the backend" />
          <div className="divide-y divide-border">
            {affiliates.slice(0, 5).map((a, i) => (
              <Link
                key={a.id}
                href={`/admin/affiliates/${a.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-surface-2 sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted">{a.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge status={a.status}>{a.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Earnings status" subtitle="Store-reported records" />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <AmountTile
              label="Earned"
              amount={earned}
              tone="approved"
              currency={currency}
              info="Owed to affiliates from orders the store has confirmed as paid. This is what payout requests draw on."
            />
            <AmountTile
              label="Reversed"
              amount={reversed}
              tone="reversed"
              currency={currency}
              info="From orders later cancelled or refunded. Not owed to anyone, and excluded from every other figure."
            />
            <AmountTile
              label="Paid"
              amount={paid}
              tone="paid"
              currency={currency}
              info="Already transferred out to affiliates and recorded against a payout."
              note={paid ? undefined : "Payouts aren't built yet."}
            />
          </div>
        </Card>
      </div>

    </div>
  );
}

