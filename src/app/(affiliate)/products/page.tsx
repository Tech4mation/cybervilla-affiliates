"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ImageOff, Link2, Tag } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { InfoHint } from "@/components/ui/InfoHint";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput, Select } from "@/components/ui/Toolbar";
import {
  ApiError,
  fetchCategories,
  fetchProductRewards,
  fetchProducts,
  productImageUrl,
  type ApiCategory,
  type ApiProduct,
  type CatalogueState,
  type ProductReward,
} from "@/lib/api";
import { formatCurrency, timeAgo } from "@/lib/utils";

const PER_PAGE = 24;
const ALL_CATEGORIES = "All Categories";

/**
 * A product photograph, or a tidy gap where one would be.
 *
 * Plenty of the catalogue has no picture, and a broken image icon on a product
 * card looks like the page is broken rather than like the product is missing a
 * photograph.
 */
function ProductImage({ product }: { product: ApiProduct }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-32 items-center justify-center bg-surface-2 text-muted">
        <ImageOff size={24} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by our own API, which next/image would need configuring for
    <img
      src={productImageUrl(product)}
      alt={product.name}
      onError={() => setFailed(true)}
      className="h-32 w-full bg-surface-2 object-contain p-2"
    />
  );
}

/**
 * What the campaign tag reveals when an affiliate hovers it.
 *
 * Always says "on top of your markup": the whole point of a campaign is that
 * it does not replace what they already earn, and an affiliate reading a bare
 * percentage could easily assume it does.
 */
function rewardTooltip(reward: ProductReward, product: ApiProduct): string {
  const currency = reward.currency ?? product.currency;
  const amount = formatCurrency(reward.amount, currency);
  if (reward.rewardType === "percent") {
    return (
      `${reward.campaign}: earn ${reward.rewardValue}% commission on this product — ` +
      `${amount} on a single unit, and more if they buy several. ` +
      `This is on top of your own markup.`
    );
  }
  return (
    `${reward.campaign}: earn ${amount} commission for every one of these you sell, ` +
    `on top of your own markup.`
  );
}

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState(ALL_CATEGORIES);
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [catalogue, setCatalogue] = useState<CatalogueState | null>(null);
  // Which products currently carry a campaign reward, and what it pays. A
  // failed fetch leaves this empty, which simply means no card mentions a
  // campaign — never a broken page.
  const [rewards, setRewards] = useState<Record<string, ProductReward>>({});
  const [error, setError] = useState<string | null>(null);

  // Which filters the products on screen belong to. Comparing it with the
  // filters currently selected is what "loading" means here — a flag set at the
  // top of the effect would be one more thing to keep in step with them.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const requestKey = `${search}|${categoryName}|${page}`;
  const loading = loadedKey !== requestKey;

  // Typing shouldn't put a request on the wire per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then((result) => setCategories(result.categories))
      // A missing filter is a smaller problem than a missing product list, and
      // the list below reports the outage loudly enough for both.
      .catch(() => undefined);
    fetchProductRewards()
      .then((result) => setRewards(result.rewards))
      // No campaigns shown beats a page that will not load because an extra
      // was unavailable.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const categoryId = useMemo(
    () => categories.find((c) => c.name === categoryName)?.id ?? null,
    [categories, categoryName],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts({ search, categoryId, page, perPage: PER_PAGE }, controller.signal)
      .then((result) => {
        setProducts(result.products);
        setTotal(result.total);
        setCatalogue(result.catalogue);
        setError(null);
        setLoadedKey(requestKey);
      })
      .catch((problem: unknown) => {
        // Abandoned because the filters moved on; the next request owns the screen.
        if (problem instanceof DOMException && problem.name === "AbortError") return;
        setProducts([]);
        setTotal(0);
        setError(
          problem instanceof ApiError
            ? problem.message
            : "Something went wrong loading the product list.",
        );
        setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [search, categoryId, page, requestKey]);

  const categoryOptions = useMemo(
    () => [ALL_CATEGORIES, ...categories.map((c) => c.name)],
    [categories],
  );
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Browse products you&apos;re eligible to promote. Prices come from the CyberVilla store.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Search products…" className="sm:max-w-xs" />
        <Select
          value={categoryName}
          onChange={(value) => {
            setCategoryName(value);
            setPage(1);
          }}
          options={categoryOptions}
        />
        <span className="text-xs text-muted sm:ml-auto">
          {loading ? "Loading…" : `${total} product${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {catalogue?.stale && catalogue.syncedAt && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
          <AlertCircle size={13} />
          Prices last checked with the store {timeAgo(catalogue.syncedAt)}.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm text-foreground">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
          <p>{error}</p>
        </div>
      )}

      {loading && products.length === 0 && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-surface-2/40">
              <span className="sr-only">Loading products</span>
            </Card>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const reward = rewards[String(product.id)];
            return (
            <Card key={product.id} className="flex flex-col overflow-hidden">
              <ProductImage product={product} />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-sm font-medium leading-snug text-foreground">{product.name}</h3>
                {product.category && <p className="text-xs text-muted">{product.category}</p>}
                {reward && (
                  // The tag says a campaign exists; the figures sit behind it
                  // so the card stays quiet. InfoHint opens on hover for a
                  // mouse, on tap for a touch screen, and on keyboard focus —
                  // a hover-only tooltip would simply not exist on a phone.
                  <InfoHint
                    label={product.name}
                    text={rewardTooltip(reward, product)}
                    className="w-fit"
                    triggerClassName="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20"
                  >
                    <Tag size={11} /> {reward.campaign}
                  </InfoHint>
                )}
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {formatCurrency(product.price, product.currency)}
                    </p>
                  </div>
                  {/* Carries the product so the link form opens with it
                      already chosen — see the preset handling in links/page. */}
                  <Link
                    href={{ pathname: "/links", query: { product: product.id } }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-black hover:bg-accent-strong"
                  >
                    <Link2 size={13} /> Get Link
                  </Link>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
          No products match your filters.
        </div>
      )}

      {pageCount > 1 && (
        <Card>
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
            total={total}
            pageSize={PER_PAGE}
          />
        </Card>
      )}
    </div>
  );
}
