"use client";

import { Suspense, useEffect, useState } from "react";
import { Copy, Check, Plus, AlertCircle, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSearchParams } from "next/navigation";
import {
  createAffiliateLink,
  deleteAffiliateLink,
  fetchAffiliateLinks,
  fetchProduct,
  fetchProducts,
  type AffiliateLinkData,
  type ApiProduct,
} from "@/lib/api";
import {
  MAX_MARKUP_PERCENT,
  checkMarkupPercent,
} from "@/lib/rules";
import type { AffiliateLink } from "@/lib/types";
import { cn, copyToClipboard, formatCurrency, formatNumber } from "@/lib/utils";

const DEFAULT_MARKUP = 0;

function toLink(l: AffiliateLinkData): AffiliateLink {
  const isProduct = l.targetType === "Product";
  return {
    id: l.id,
    label: l.label,
    targetType: isProduct ? "Product" : "Storewide",
    target: isProduct ? l.productName || "Product no longer listed" : "Entire store",
    url: l.url,
    code: l.code,
    sales: l.sales ?? 0,
    earnings: l.earnings ?? 0,
    commissions: l.earnings ?? 0,
    currency: l.currency ?? null,
    createdAt: l.createdAt || new Date().toISOString().slice(0, 10),
    status: l.active ? "active" : "inactive",
    markupPercent: l.markupPercent,
  };
}

/** "idle" until clicked, then whether the clipboard actually took it. */
type CopyState = "idle" | "copied" | "failed";

function useCopy() {
  const [state, setState] = useState<CopyState>("idle");
  async function run(text: string) {
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), ok ? 1500 : 4000);
  }
  return { state, run };
}

function CopyButton({ text }: { text: string }) {
  const { state, run } = useCopy();
  return (
    <button
      onClick={() => run(text)}
      title={state === "failed" ? "Select the text and press Ctrl+C" : "Copy"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
        state === "failed"
          ? "border-danger text-danger"
          : "border-border text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      {state === "copied" ? (
        <Check size={13} className="text-success" />
      ) : state === "failed" ? (
        <AlertCircle size={13} />
      ) : (
        <Copy size={13} />
      )}
      {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy"}
    </button>
  );
}

function CopyableCode({ code }: { code: string }) {
  const { state, run } = useCopy();
  return (
    <button
      onClick={() => run(code)}
      title={state === "failed" ? "Select the code and press Ctrl+C" : "Copy code"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs font-semibold tracking-wide",
        state === "failed" ? "border-danger text-danger" : "border-border text-accent hover:bg-surface-2"
      )}
    >
      {code}
      {state === "copied" ? (
        <Check size={12} className="text-success" />
      ) : state === "failed" ? (
        <AlertCircle size={12} className="text-danger" />
      ) : (
        <Copy size={12} className="text-muted" />
      )}
    </button>
  );
}

function LinksContent() {
  const params = useSearchParams();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [maxLinks, setMaxLinks] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [markup, setMarkup] = useState<string>(String(DEFAULT_MARKUP));
  const [generated, setGenerated] = useState<AffiliateLink | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Where the link lands. "Storewide" is the default, so doing nothing gives
  // the behaviour that was there before.
  const [target, setTarget] = useState<"Storewide" | "Product">("Storewide");
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ApiProduct[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const markupNum = Number(markup);

  // The catalogue runs to thousands of items, so this searches the database
  // rather than offering a dropdown of everything.
  useEffect(() => {
    const term = productQuery.trim();
    // Nothing is cleared here: setting state straight from an effect causes a
    // cascading render. Whether results are shown is derived below instead.
    if (target !== "Product" || term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchProducts({ search: term, perPage: 8 }, controller.signal)
        .then((page) => {
          setProductResults(page.products);
          setSearchingProducts(false);
        })
        .catch(() => setSearchingProducts(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [productQuery, target]);

  // Arriving from a product's "Get Link" button preselects that product.
  useEffect(() => {
    const preset = Number(params.get("product"));
    if (!preset) return;
    const controller = new AbortController();
    fetchProduct(preset, controller.signal)
      .then(({ product: found }) => {
        setTarget("Product");
        setProduct(found);
        setProductQuery(found.name);
      })
      // A stale or bad id just leaves the form on its storewide default.
      .catch(() => undefined);
    return () => controller.abort();
  }, [params]);

  // Starts with the request, so nothing is set synchronously when the effect
  // below runs it; every state change happens once the response is in.
  function load() {
    return fetchAffiliateLinks()
      .then((page) => {
        setLinks(page.links.map(toLink));
        setMaxLinks(page.maxLinks ?? null);
        setLoadError(null);
      })
      // A failed load must not look like "you have no links yet".
      .catch((error) =>
        setLoadError(error instanceof Error ? error.message : "We could not load your links."),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  function retry() {
    setLoading(true);
    setLoadError(null);
    void load();
  }

  const check = checkMarkupPercent(markupNum);
  const valid = check.ok;
  // An empty box reads as no markup, which is the default and is allowed: the
  // link then sells at CyberVilla's own price and earns nothing. It is said
  // plainly under the field rather than blocked.
  const earns = markupNum > 0;

  const needsProduct = target === "Product" && !product;
  // The server enforces this too — the button state is only a courtesy.
  const atLimit = maxLinks !== null && links.length >= maxLinks;

  async function handleDelete(link: AffiliateLink) {
    const earned = (link.earnings ?? 0) > 0 || link.sales > 0;
    const warning = earned
      ? `Delete "${link.label}"?\n\nIt will stop working immediately. Its ${link.sales} recorded sale(s) and earnings stay on your account.`
      : `Delete "${link.label}"?\n\nIt will stop working immediately and anyone who already has it will just see the normal shop.`;
    if (!window.confirm(warning)) return;

    setDeleting(link.id);
    setSubmitError(null);
    try {
      await deleteAffiliateLink(link.id);
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      if (generated?.id === link.id) setGenerated(null);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "We could not delete that link. Please try again.",
      );
    } finally {
      setDeleting(null);
    }
  }
  // Derived, so clearing the box hides stale matches without an effect.
  const matches = target === "Product" && productQuery.trim().length >= 2 ? productResults : [];

  async function handleGenerate() {
    if (!valid || submitting || needsProduct || atLimit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const chosen = target === "Product" ? product : null;
      // The affiliate no longer names a link, so it names itself after where it
      // points. The markup is appended only when there is one, which is what
      // tells two links to the same place apart.
      const where = chosen ? chosen.name.slice(0, 40) : "Shop link";
      const { link: apiLink } = await createAffiliateLink({
        markupPercent: markupNum,
        productId: chosen?.id,
        label: markupNum > 0 ? `${where} · ${markupNum}%` : where,
      });
      const newLink = toLink(apiLink);
      setLinks((prev) => [newLink, ...prev]);
      setGenerated(newLink);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "We could not create that link. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading...</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Every link comes with a matching code you can say or text instead. You decide what to sell at — up to{" "}
        {MAX_MARKUP_PERCENT}% above CyberVilla&apos;s price — and whatever the buyer pays above that price is
        yours. A link can open the shop or go straight to one product, but either way your markup travels with
        the link: if they buy something else instead, you still earn on it.
      </p>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">We could not load your links.</p>
            <p className="text-xs opacity-90">{loadError}</p>
          </div>
          <button
            onClick={retry}
            className="shrink-0 rounded-md border border-danger px-2.5 py-1 text-xs font-medium hover:bg-danger/10"
          >
            Try again
          </button>
        </div>
      )}

      <Card>
        <CardHeader title="Generate a new affiliate link" subtitle="Links and codes carry your unique tracking identifier automatically." />
        <div className="space-y-3 border-b border-border p-4 sm:p-5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">Where the link opens</label>
            <div className="flex gap-2">
              {(["Storewide", "Product"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTarget(option)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    target === option
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:bg-surface-2",
                  )}
                >
                  {option === "Storewide" ? "The shop" : "One product"}
                </button>
              ))}
            </div>
          </div>

          {target === "Product" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Which product</label>
              {product ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-foreground">{product.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setProduct(null);
                      setProductQuery("");
                    }}
                    className="shrink-0 text-xs font-medium text-muted hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setSearchingProducts(e.target.value.trim().length >= 2);
                    }}
                    placeholder="Search the catalogue…"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  {productQuery.trim().length >= 2 && (
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
                      {searchingProducts && (
                        <p className="px-3 py-2 text-xs text-muted">Searching…</p>
                      )}
                      {!searchingProducts && matches.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted">No products match that search.</p>
                      )}
                      {matches.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setProduct(item);
                            setProductResults([]);
                          }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2"
                        >
                          <span className="min-w-0 truncate text-foreground">{item.name}</span>
                          <span className="shrink-0 text-xs text-muted">
                            {formatCurrency(item.price, item.currency)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-muted">
                    The customer lands on this product. Your markup still applies to anything else they buy.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 sm:p-5">
            <label className="text-xs font-medium text-muted">Your markup</label>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-[140px]">
                <input
                  type="number"
                  min={0}
                  max={MAX_MARKUP_PERCENT}
                  step={0.5}
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  className={cn(
                    "w-full rounded-lg border bg-surface-2 py-2 pl-3 pr-7 text-sm text-foreground focus:outline-none",
                    valid ? "border-border focus:border-accent" : "border-danger focus:border-danger"
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
              </div>
              {check.ok ? (
                earns ? (
                  <span className="text-xs font-medium text-success">
                    Everything bought through this link sells for {markupNum}% more, and that {markupNum}% is
                    yours
                  </span>
                ) : (
                  <span className="text-xs font-medium text-muted">
                    No markup: this link sells at CyberVilla&apos;s own price and earns you nothing. Add a
                    percentage above if you want to earn on it.
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                  <AlertCircle size={13} /> {check.reason}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              A storewide link has no single product to price, so you set the markup instead. It applies to
              whatever the customer buys, up to {MAX_MARKUP_PERCENT}%.
            </p>
        </div>

        <div className="space-y-3 border-t border-border p-4 sm:p-5">
          <button
            onClick={handleGenerate}
            disabled={!valid || needsProduct || atLimit || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {submitting ? "Generating…" : "Generate Link & Code"}
          </button>
          {atLimit && (
            <p className="inline-flex items-start gap-1.5 text-xs text-muted">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              You have all {maxLinks} of your links. Delete one below to make room for another.
            </p>
          )}
          {submitError && (
            <p className="inline-flex items-start gap-1.5 text-xs font-medium text-danger">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {submitError}
            </p>
          )}
          {generated && (
            <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted">Link</span>
                <code className="min-w-0 flex-1 truncate text-xs text-foreground">{generated.url}</code>
                <CopyButton text={generated.url} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted">Code</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  Say or text <span className="font-semibold text-accent">{generated.code}</span> as a substitute
                </span>
                <CopyButton text={generated.code} />
              </div>
              <p className="flex items-start gap-1.5 text-[11px] text-muted">
                <ShieldCheck size={12} className="mt-0.5 shrink-0 text-success" />
                The address carries only your code. The price it stands for is looked up when someone opens
                it, so nobody can change it on the way through.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Your links & codes"
          subtitle={maxLinks !== null ? `${links.length} of ${maxLinks} used` : `${links.length} generated`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Link</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Your price</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Earnings</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium sm:pr-5" />
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted sm:px-5">
                    {loadError
                      ? "Your links could not be loaded — see the message above."
                      : "No links yet. Generate one above and it will appear here."}
                  </td>
                </tr>
              )}
              {links.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="max-w-[220px] px-4 py-3 sm:px-5">
                    <p className="truncate font-medium text-foreground">{l.label}</p>
                    <p className="truncate text-xs text-muted">{l.url}</p>
                  </td>
                  <td className="px-4 py-3">
                    <CopyableCode code={l.code} />
                  </td>
                  <td className="px-4 py-3 text-muted">{l.targetType}</td>
                  <td className="px-4 py-3 text-muted">
                    <span className="text-foreground">
                      {l.markupPercent ? `+${l.markupPercent}% on everything` : "CyberVilla's price"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{formatNumber(l.sales)}</td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(l.earnings ?? l.commissions, l.currency ?? null)}</td>
                  <td className="px-4 py-3">
                    <Badge status={l.status}>{l.status}</Badge>
                  </td>
                  <td className="px-4 py-3 sm:pr-5">
                    <div className="flex items-center justify-end gap-2">
                      <CopyButton text={l.url} />
                      <button
                        onClick={() => handleDelete(l)}
                        disabled={deleting === l.id}
                        title="Delete this link"
                        aria-label={`Delete ${l.label}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-danger hover:text-danger disabled:opacity-50"
                      >
                        {deleting === l.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function LinksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted">Loading…</div>}>
      <LinksContent />
    </Suspense>
  );
}
