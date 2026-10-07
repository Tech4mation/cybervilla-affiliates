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
const STATUSES = ["All Statuses", "completed", "paid", "reversed"];
// "Source" means which link brought the sale in, so the choices are the
// kinds of link there are — not the products, which the store never tells us.
const SOURCES = ["All Sources", "Storewide links", "Product links"];
const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [source, setSource] = useState("All Sources");
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
        (t.affiliateCode && t.affiliateCode.toLowerCase().includes(q)) ||
        (t.sourceLabel && t.sourceLabel.toLowerCase().includes(q));
      const matchesStatus = status === "All Statuses" || t.status === status;
      const matchesSource =
        source === "All Sources" ||
        (source === "Storewide links" && t.sourceKind === "storewide") ||
        (source === "Product links" && t.sourceKind === "product");
      return matchesQuery && matchesStatus && matchesSource;
    });
    const sorted = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "date") return dir * (new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime());
      if (sortKey === "amount") return dir * (a.amountTotal - b.amountTotal);
      return dir * (a.earning - b.earning);
    });
    return sorted;
  }, [earnings, query, status, source, sortKey, sortDir]);

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
      earning_markup: t.earning,
      earning_commission: t.commission ?? 0,
      earning_total: t.totalDue ?? t.earning,
      items: (t.lines ?? []).map((l) => `${l.quantity}x ${l.name}`).join("; "),
      status: t.status,
      affiliate_code: t.affiliateCode,
      source: t.sourceKind === "product" ? "product link" : "storewide link",
      source_label: t.sourceLabel ?? "",
      payout: t.payoutRef ?? "",
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
          placeholder="Search order ID, code, source…"
          className="sm:max-w-xs"
        />
        <Select value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={STATUSES} />
        <Select value={source} onChange={(value) => { setSource(value); setPage(1); }} options={SOURCES} />
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
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Order</th>
                <SortableHeader label="Date" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
                <SortableHeader label="Order total" active={sortKey === "amount"} dir={sortDir} onClick={() => toggleSort("amount")} />
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <SortableHeader label="You earn" active={sortKey === "earning"} dir={sortDir} onClick={() => toggleSort("earning")} />
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium sm:pr-5">Payout</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr key={t.orderRef} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">{t.orderRef}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {t.occurredAt ? formatDate(t.occurredAt) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatCurrency(t.amountTotal, t.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {t.lines && t.lines.length > 0 ? (
                      <div className="space-y-0.5">
                        {t.lines.slice(0, 2).map((line, i) => (
                          <p key={i} className="text-xs text-foreground">
                            <span className="text-muted">{line.quantity}&times;</span> {line.name}
                            {line.commission > 0 && (
                              <span className="ml-1 text-accent">
                                +{formatCurrency(line.commission, t.currency)}
                              </span>
                            )}
                          </p>
                        ))}
                        {t.lines.length > 2 && (
                          <p className="text-[11px] text-muted">
                            and {t.lines.length - 2} more
                          </p>
                        )}
                      </div>
                    ) : (
                      // Orders from before the store began reporting its
                      // lines. Saying so beats an empty cell that reads as
                      // "nothing was bought".
                      <span className="text-xs text-muted">Not reported</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{t.sourceLabel || t.sourceCode || t.affiliateCode || "—"}</p>
                    <p className="text-[11px] text-muted">
                      {t.sourceKind === "product"
                        ? "Product link"
                        : t.sourceKind === "storewide"
                          ? "Storewide link"
                          : "Link no longer on record"}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <p className="font-medium text-accent">
                      {formatCurrency(t.totalDue ?? t.earning, t.currency)}
                    </p>
                    {(t.commission ?? 0) > 0 && (
                      <p className="text-[11px] text-muted">
                        {formatCurrency(t.earning, t.currency)} markup ·{" "}
                        <span className="text-accent">
                          {formatCurrency(t.commission ?? 0, t.currency)} campaign
                        </span>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={t.status}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 sm:pr-5">
                    {t.status === "reversed" ? (
                      <span className="text-xs text-muted">—</span>
                    ) : t.payoutRef ? (
                      <span
                        title={`Settled in ${t.payoutRef}`}
                        className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
                      >
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                        Unpaid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
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
