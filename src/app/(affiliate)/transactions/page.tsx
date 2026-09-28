"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Download } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput, Select } from "@/components/ui/Toolbar";
import { Pagination } from "@/components/ui/Pagination";
import { fetchAffiliateEarnings, type AffiliateEarning } from "@/lib/api";
import { downloadFile, formatCurrency, formatDate, toCsv } from "@/lib/utils";

type SortKey = "date" | "amount" | "earning";

// Exactly the states the backend can report (see Earning.status). Offering
// anything else gives a filter that silently never matches.
const STATUSES = ["All Statuses", "pending", "approved", "payable", "paid", "reversed"];
const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAffiliateEarnings()
      .then(({ earnings }) => setEarnings(earnings))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load your transactions."),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const rows = earnings.filter((t) => {
      const q = query.toLowerCase();
      const matchesQuery =
        t.orderRef?.toLowerCase().includes(q) ||
        (t.affiliateCode && t.affiliateCode.toLowerCase().includes(q));
      const matchesStatus = status === "All Statuses" || t.status === status;
      return matchesQuery && matchesStatus;
    });
    const sorted = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") return dir * (new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime());
      if (sortKey === "amount") return dir * (a.amountTotal - b.amountTotal);
      return dir * (a.earning - b.earning);
    });
    return sorted;
  }, [earnings, query, status, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Filtering to fewer rows than the current page would otherwise strand the
  // user on an empty page reading "no transactions match", with the pager
  // hidden so there was no way back.
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function handleExport() {
    const rows = filtered.map((t) => ({
      order_ref: t.orderRef,
      date: t.occurredAt,
      amount_total: t.amountTotal,
      earning: t.earning,
      status: t.status,
      affiliate_code: t.affiliateCode,
    }));
    downloadFile(toCsv(rows), `cybervilla-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading transactions...</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Every transaction generated through your affiliate links or promotional codes.
      </p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error} — this is a loading problem, not an empty account.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={(value) => { setQuery(value); setPage(1); }}
          placeholder="Search order ID, code…"
          className="sm:max-w-xs"
        />
        <Select value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={STATUSES} />
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-2 sm:ml-auto"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <Card>
        <CardHeader title="Transactions" subtitle={`${filtered.length} matching transactions`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Order</th>
                <SortableHeader label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
                <th className="px-4 py-3 font-medium">Amount</th>
                <SortableHeader label="Earning" active={sortKey === "earning"} dir={sortDir} onClick={() => toggleSort("earning")} />
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr key={t.orderRef} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">{t.orderRef}</td>
                  <td className="px-4 py-3 text-muted">{t.occurredAt ? formatDate(t.occurredAt) : "—"}</td>
                  <td className="px-4 py-3 text-foreground">{formatCurrency(t.amountTotal, t.currency)}</td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(t.earning, t.currency)}</td>
                  <td className="px-4 py-3 text-muted">{t.affiliateCode || "—"}</td>
                  <td className="px-4 py-3 sm:pr-5">
                    <Badge status={t.status}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                    {error
                      ? "Your transactions could not be loaded — see the message above."
                      : "No transactions match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} pageCount={pageCount} onChange={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
      </Card>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3 font-medium">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown size={12} className={active ? "text-accent" : "text-muted"} />
        {active && <span className="sr-only">{dir}</span>}
      </button>
    </th>
  );
}
