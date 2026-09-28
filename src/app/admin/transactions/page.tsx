"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchAdminEarnings, type AdminEarning } from "@/lib/api";
import { downloadFile, formatCurrency, formatDate, toCsv } from "@/lib/utils";

export default function AdminTransactionsPage() {
  const [earnings, setEarnings] = useState<AdminEarning[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Starts true so the table never claims "no transactions" before it knows.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAdminEarnings()
      .then((page) => {
        setEarnings(page.earnings);
        setTotal(page.total ?? page.earnings.length);
        setTruncated(Boolean(page.truncated));
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load transaction records."),
      )
      .finally(() => setLoading(false));
  }, []);

  function handleExport() {
    const rows = earnings.map((t) => ({
      order_ref: t.orderRef,
      date: t.occurredAt,
      affiliate_code: t.affiliateCode,
      amount: t.amountTotal,
      earning: t.earning,
      status: t.status,
    }));
    downloadFile(toCsv(rows), `cybervilla-platform-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Store-reported earning records from the backend.</p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error} — this is a loading problem, not an absence of records.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-2 sm:ml-auto"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <Card>
          <CardHeader
            title="Transactions"
            subtitle={
              loading
                ? "Loading…"
                : truncated
                  ? `Showing the ${earnings.length} most recent of ${total} records`
                  : `${total} backend record${total === 1 ? "" : "s"}`
            }
          />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Order</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Affiliate</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">Earning</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((t) => (
                <tr key={t.orderRef} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">{t.orderRef}</td><td className="px-4 py-3 text-muted">{t.occurredAt ? formatDate(t.occurredAt) : "—"}</td><td className="px-4 py-3 text-foreground">{t.affiliateCode || "Unattributed"}</td><td className="px-4 py-3 text-foreground">{formatCurrency(t.amountTotal, t.currency)}</td><td className="px-4 py-3 font-medium text-accent">{formatCurrency(t.earning, t.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge status={t.status}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
              {earnings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                    {loading
                      ? "Loading transactions…"
                      : error
                        ? "Transaction records could not be loaded — see the message above."
                        : "No transaction records have been reported by the backend."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
