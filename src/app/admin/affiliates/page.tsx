"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchInput, Select } from "@/components/ui/Toolbar";
import { Pagination } from "@/components/ui/Pagination";
import { useAppData } from "@/lib/store";
import { formatDate } from "@/lib/utils";

// The states the backend actually stores on an affiliate account.
const STATUSES = ["All Statuses", "approved", "pending", "rejected", "suspended"];
const PAGE_SIZE = 8;

export default function AdminAffiliatesPage() {
  const { affiliates, affiliateTotal, affiliateStats, affiliateError, loadingAffiliates, reloadAffiliates } =
    useAppData();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Searching and filtering happen in the database, so an application made
  // months ago is still findable — previously only the newest 20 were loaded
  // and everything older could never be reviewed.
  useEffect(() => {
    void reloadAffiliates({
      status: status === "All Statuses" ? "all" : status,
      search: debouncedQuery,
      page,
      perPage: PAGE_SIZE,
    });
  }, [reloadAffiliates, status, debouncedQuery, page]);

  const pageCount = Math.max(1, Math.ceil(affiliateTotal / PAGE_SIZE));
  const pendingCount = affiliateStats.pending;

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Every affiliate application recorded by the backend.
        {pendingCount > 0 && (
          <span className="ml-2 font-medium text-accent">
            {pendingCount} application{pendingCount > 1 ? "s" : ""} awaiting review.
          </span>
        )}
      </p>

      {affiliateError && (
        <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <span>{affiliateError}</span>
          <button onClick={() => void reloadAffiliates()} className="font-semibold underline">Retry</button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={changeQuery} placeholder="Search name or email…" className="sm:max-w-xs" />
        <Select value={status} onChange={changeStatus} options={STATUSES} />
        <span className="text-xs text-muted sm:ml-auto">
          {loadingAffiliates ? "Loading…" : `${affiliateTotal} matching`}
        </span>
      </div>

      <Card>
        <CardHeader
          title="Affiliates"
          subtitle={loadingAffiliates ? "Loading…" : `${affiliateTotal} matching this filter`}
        />
        {loadingAffiliates ? (
          <p className="p-10 text-center text-sm text-muted">Loading applications...</p>
        ) : <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Affiliate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium sm:pr-5" />
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={a.status}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{a.joinedAt ? formatDate(a.joinedAt) : "—"}</td>
                  <td className="px-4 py-3 sm:pr-5">
                    <div className="flex items-center justify-end gap-2">
                      {a.status === "pending" ? (
                        <Link
                          href={`/admin/affiliates/${a.id}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-accent-strong"
                        >
                          <Search size={13} /> Review application
                        </Link>
                      ) : (
                        <>
                          <Link
                            href={`/admin/affiliates/${a.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                          >
                            View <ChevronRight size={13} />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {affiliates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted">
                    {affiliateError
                      ? "Applications could not be loaded — see the message above."
                      : "No affiliates match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>}
        <Pagination page={page} pageCount={pageCount} onChange={setPage} total={affiliateTotal} pageSize={PAGE_SIZE} />
      </Card>
    </div>
  );
}
