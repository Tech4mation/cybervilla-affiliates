"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Loader2, Plus, Tag, Wand2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput, Select } from "@/components/ui/Toolbar";
import {
  CampaignForm,
  emptyDraft,
  toDraft,
} from "@/components/admin/CampaignForm";
import {
  createCampaign,
  fetchAdminCampaigns,
  fetchCategories,
  fetchProducts,
  stopCampaign,
  updateCampaign,
  type ApiCategory,
  type ApiProduct,
  type Campaign,
  type CampaignInput,
  type CatalogueState,
} from "@/lib/api";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";

const PER_PAGE = 24;
const ALL_CATEGORIES = "All Categories";

/**
 * The catalogue and the campaigns that pay extra on it, on one page.
 *
 * They were two pages, which meant putting a product on campaign required
 * leaving the catalogue, opening Campaigns, and searching for the product
 * you were just looking at — in a picker reading the same catalogue.
 *
 * Campaigns keep their own section rather than dissolving into the table.
 * A campaign is a named offer with dates and several products; that does
 * not live in a product row, and with hundreds of products a table would
 * bury the handful of campaigns you actually need to see.
 */
export default function AdminProductsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [draft, setDraft] = useState<CampaignInput | null>(null);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [stopping, setStopping] = useState<Campaign | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState(ALL_CATEGORIES);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [catalogue, setCatalogue] = useState<CatalogueState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadCampaigns() {
    return fetchAdminCampaigns()
      .then(({ campaigns }) => setCampaigns(campaigns))
      .catch(() => undefined);
  }

  useEffect(() => {
    void loadCampaigns();
    fetchCategories()
      .then((result) => setCategories(result.categories))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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
        setCatalogue(result.catalogue ?? null);
        setError(null);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Could not load the catalogue.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, categoryId, page]);

  /**
   * Which campaigns cover each product.
   *
   * Every one of them, not just the best-paying. An admin managing offers
   * needs to see that two campaigns overlap on a product — that is usually
   * a mistake, and showing only the winner would hide it. (Affiliates are
   * shown the single best one, which the server works out; the rule lives
   * there and is deliberately not repeated here.)
   */
  const campaignsByProduct = useMemo(() => {
    const map = new Map<number, Campaign[]>();
    campaigns
      .filter((c) => c.live)
      .forEach((campaign) => {
        campaign.products.forEach((entry) => {
          if (entry.productId == null) return;
          const list = map.get(entry.productId) ?? [];
          list.push(campaign);
          map.set(entry.productId, list);
        });
      });
    return map;
  }, [campaigns]);

  async function handleSave() {
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updateCampaign(editing.id, draft);
      else await createCampaign(draft);
      setDraft(null);
      setEditing(null);
      await loadCampaigns();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Could not save that campaign.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (!stopping) return;
    setBusy(true);
    try {
      await stopCampaign(stopping.id);
      setStopping(null);
      await loadCampaigns();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not stop that campaign.");
    } finally {
      setBusy(false);
    }
  }

  /** Start a new campaign with this product already chosen. */
  function campaignFor(product: ApiProduct) {
    setEditing(null);
    setFormError(null);
    setDraft({
      ...emptyDraft(),
      name: `${product.name.slice(0, 40)} promotion`,
      products: [{ productId: product.id, productTmplId: null, name: product.name }],
    });
  }

  const running = campaigns.filter((c) => c.live);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        The catalogue, and the campaigns that pay affiliates extra on part of it. A campaign is paid{" "}
        <strong className="font-medium text-foreground">on top of</strong> the markup an affiliate
        already keeps, out of CyberVilla&apos;s margin.
      </p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {/* ---- campaigns ------------------------------------------------ */}
      <Card>
        <CardHeader
          title="Campaigns"
          subtitle={
            campaigns.length === 0
              ? "None yet"
              : `${running.length} running, ${campaigns.length} in total`
          }
          action={
            <button
              onClick={() => {
                setEditing(null);
                setDraft(emptyDraft());
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:bg-accent-strong"
            >
              <Plus size={14} /> New campaign
            </button>
          }
        />
        <div className="divide-y divide-border">
          {campaigns.length === 0 && (
            <p className="p-8 text-center text-sm text-muted">
              No campaigns yet. Affiliates earn their markup regardless; a campaign adds more on
              chosen products.
            </p>
          )}
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4 sm:px-5">
              <span className="rounded-lg bg-surface-2 p-2 text-muted">
                <Tag size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <Badge status={c.live ? "approved" : "pending"}>
                    {c.live ? "Running" : c.active ? "Scheduled or ended" : "Stopped"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs">
                  <span className="font-medium text-accent">
                    {c.rewardType === "percent"
                      ? `${c.rewardValue}% of each sale`
                      : `${formatCurrency(c.rewardValue)} per item`}
                  </span>
                  <span className="text-muted">
                    {" "}
                    · {c.productCount} product{c.productCount === 1 ? "" : "s"} ·{" "}
                    {c.startsAt ? `from ${formatDate(c.startsAt)}` : "no start date"}
                    {c.endsAt ? ` until ${formatDate(c.endsAt)}` : ", no end date"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(c);
                    setDraft(toDraft(c));
                    setFormError(null);
                  }}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                >
                  Edit
                </button>
                {c.active && (
                  <button
                    onClick={() => setStopping(c)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-danger hover:text-danger"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- catalogue ------------------------------------------------ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search the whole catalogue…"
          className="sm:max-w-xs"
        />
        <Select
          value={categoryName}
          onChange={(value) => {
            setCategoryName(value);
            setPage(1);
          }}
          options={[ALL_CATEGORIES, ...categories.map((c) => c.name)]}
        />
      </div>

      <Card>
        <CardHeader
          title="Catalogue"
          subtitle={
            catalogue?.syncedAt
              ? `${total} products · read from the store ${timeAgo(catalogue.syncedAt!)}`
              : `${total} products`
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Availability</th>
                <th className="px-4 py-3 font-medium sm:pr-5" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const covering = campaignsByProduct.get(product.id) ?? [];
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground sm:px-5">{product.name}</td>
                    <td className="px-4 py-3 text-muted">{product.category ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatCurrency(product.price, product.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {covering.length === 0 ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {covering.map((c) => (
                            <p key={c.id} className="text-xs">
                              <span className="font-medium text-accent">
                                {c.rewardType === "percent"
                                  ? `${c.rewardValue}%`
                                  : formatCurrency(c.rewardValue)}
                              </span>{" "}
                              <span className="text-muted">{c.name}</span>
                            </p>
                          ))}
                          {covering.length > 1 && (
                            // Two offers on one product is nearly always a
                            // mistake; affiliates are paid the better one.
                            <p className="text-[11px] text-warning">
                              In {covering.length} campaigns — affiliates get the better one
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={product.available ? "approved" : "pending"}>
                        {product.available ? "Available" : "Unavailable"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 sm:pr-5">
                      <button
                        onClick={() => campaignFor(product)}
                        title="Start a campaign with this product"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
                      >
                        <Wand2 size={13} /> Campaign
                      </button>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                    {loading
                      ? "Loading the catalogue…"
                      : error
                        ? "The catalogue could not be read, so nothing is listed."
                        : "No products match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} total={total} pageSize={PER_PAGE} />
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-accent" />
        Product names, prices, categories and availability are read from the CyberVilla store and
        cannot be edited here. Commission is the one thing set on this page.
      </div>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={editing ? `Edit ${editing.name}` : "New campaign"}
      >
        {draft && (
          <CampaignForm
            draft={draft}
            onChange={setDraft}
            onSave={handleSave}
            busy={busy}
            error={formError}
            editing={Boolean(editing)}
          />
        )}
      </Modal>

      <Modal open={Boolean(stopping)} onClose={() => setStopping(null)} title="Stop this campaign">
        <div className="space-y-3">
          <p className="text-sm text-foreground">{stopping?.name}</p>
          <p className="text-xs text-muted">
            New sales stop earning the extra immediately. Commission already earned is untouched and
            will still be paid — the campaign stays on record so those earnings can name it.
          </p>
          <button
            onClick={handleStop}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Stop it
          </button>
        </div>
      </Modal>
    </div>
  );
}
