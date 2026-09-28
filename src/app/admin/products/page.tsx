"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchInput, Select } from "@/components/ui/Toolbar";
import { Pagination } from "@/components/ui/Pagination";
import { fetchCategories, fetchProducts, type ApiCategory, type ApiProduct } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const ALL = "All Categories";
const PER_PAGE = 24;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryName, setCategoryName] = useState(ALL);
  const [page, setPage] = useState(1);

  // What the rows on screen actually correspond to. Comparing this against the
  // current filters tells us a fetch is in flight without setting state inside
  // an effect, which would cause a cascading render.
  const [shown, setShown] = useState({ search: "", categoryName: ALL, page: 1 });
  const refreshing =
    shown.search !== debouncedQuery || shown.categoryName !== categoryName || shown.page !== page;

  const categoryId = categories.find((c) => c.name === categoryName)?.id ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => undefined); // The filter is a convenience; the list still works without it.
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // The search runs against the whole catalogue in the database, not just
    // the rows already on screen.
    fetchProducts({ search: debouncedQuery, categoryId, page, perPage: PER_PAGE }, controller.signal)
      .then((res) => {
        setProducts(res.products);
        setTotal(res.total);
        setError(null);
        setShown({ search: debouncedQuery, categoryName, page });
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Could not load the catalogue.");
        setProducts([]);
        setTotal(0);
        // Mark the attempt as settled too, or the spinner spins forever.
        setShown({ search: debouncedQuery, categoryName, page });
      })
      .finally(() => setLoadedOnce(true));
    return () => controller.abort();
  }, [debouncedQuery, categoryId, categoryName, page]);

  function changeSearch(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changeCategory(value: string) {
    setCategoryName(value);
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtering = debouncedQuery !== "" || categoryName !== ALL;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Products shown here are read from the backend catalogue.</p>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-accent" />
        Product name, price, category, availability, and images are supplied by the backend catalogue. Commission
        rules are not available from the backend yet, so this page does not invent or edit them.
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error} — the catalogue could not be read, so nothing is listed below.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={changeSearch}
          placeholder="Search the whole catalogue…"
          className="sm:max-w-xs"
        />
        <Select
          value={categoryName}
          onChange={changeCategory}
          options={[ALL, ...categories.map((c) => c.name)]}
        />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted sm:ml-auto">
          {refreshing && <Loader2 size={12} className="animate-spin" />}
          {loadedOnce ? `${total} ${filtering ? "matching" : "in catalogue"}` : "Loading…"}
        </span>
      </div>

      <Card>
        <CardHeader
          title="Catalogue"
          subtitle={
            !loadedOnce
              ? "Loading the catalogue…"
              : filtering
                ? `${total} product${total === 1 ? "" : "s"} match across the whole catalogue`
                : `${total} products in the backend catalogue`
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Availability</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="max-w-[240px] px-4 py-3 sm:px-5">
                    <p className="truncate font-medium text-foreground">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category ?? "Uncategorised"}</td>
                  <td className="px-4 py-3 text-foreground">{formatCurrency(p.price, p.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={p.available ? "text-success" : "text-muted"}>
                      {p.available ? "Available" : "Unavailable"}
                    </span>
                  </td>
                </tr>
              ))}
              {products.length === 0 && loadedOnce && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted">
                    {error
                      ? "The catalogue could not be loaded — see the message above."
                      : filtering
                        ? "No products in the catalogue match that search."
                        : "The catalogue is empty."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} pageSize={PER_PAGE} />
      </Card>
    </div>
  );
}
