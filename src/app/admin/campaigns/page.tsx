"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Search, Tag, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  createCampaign,
  fetchAdminCampaigns,
  fetchProducts,
  stopCampaign,
  updateCampaign,
  type ApiProduct,
  type Campaign,
  type CampaignInput,
  type CampaignProductRef,
} from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

/** A blank campaign, for the "new" form. */
function emptyDraft(): CampaignInput {
  return {
    name: "",
    description: "",
    rewardType: "percent",
    rewardValue: 5,
    startsAt: "",
    endsAt: "",
    active: true,
    products: [],
  };
}

function toDraft(campaign: Campaign): CampaignInput {
  return {
    name: campaign.name,
    description: campaign.description,
    rewardType: campaign.rewardType,
    rewardValue: campaign.rewardValue,
    // The form's date inputs want "YYYY-MM-DD", not a full timestamp.
    startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 10) : "",
    endsAt: campaign.endsAt ? campaign.endsAt.slice(0, 10) : "",
    active: campaign.active,
    products: campaign.products,
  };
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Campaign | null>(null);
  const [draft, setDraft] = useState<CampaignInput | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [stopping, setStopping] = useState<Campaign | null>(null);

  function load() {
    return fetchAdminCampaigns()
      .then(({ campaigns }) => {
        setCampaigns(campaigns);
        setError(null);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load campaigns."),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave() {
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await updateCampaign(editing.id, draft);
      else await createCampaign(draft);
      setDraft(null);
      setEditing(null);
      await load();
    } catch (reason) {
      // The server's wording is the useful part here — it says which rule
      // was broken — so it is shown as-is, in the form, not as a banner.
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
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not stop that campaign.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading campaigns…</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        A campaign pays affiliates extra for selling particular products. It is paid{" "}
        <strong className="font-medium text-foreground">on top of</strong> the markup they already
        keep, out of CyberVilla&apos;s margin — so only put products here you can afford to give more away on.
      </p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setDraft(emptyDraft());
            setFormError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong"
        >
          <Plus size={15} /> New campaign
        </button>
      </div>

      <Card>
        <CardHeader
          title="Campaigns"
          subtitle={`${campaigns.filter((c) => c.live).length} running now, ${campaigns.length} in total`}
        />
        <div className="divide-y divide-border">
          {campaigns.length === 0 && (
            <p className="p-10 text-center text-sm text-muted">
              No campaigns yet. Affiliates earn their markup regardless; a campaign adds more on
              chosen products.
            </p>
          )}
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
              <span className="rounded-lg bg-surface-2 p-2 text-muted">
                <Tag size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <Badge status={c.live ? "approved" : "pending"}>
                    {c.live ? "Running" : c.active ? "Scheduled or ended" : "Stopped"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-accent">
                  {c.rewardType === "percent"
                    ? `${c.rewardValue}% of each sale`
                    : `${formatCurrency(c.rewardValue)} per item`}{" "}
                  <span className="text-muted">
                    · {c.productCount} product{c.productCount === 1 ? "" : "s"}
                  </span>
                </p>
                {c.description && <p className="mt-1 text-xs text-muted">{c.description}</p>}
                <p className="mt-1 text-[11px] text-muted">
                  {c.startsAt ? `From ${formatDate(c.startsAt)}` : "No start date"}
                  {" · "}
                  {c.endsAt ? `until ${formatDate(c.endsAt)}` : "no end date"}
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
            {busy && <Loader2 size={14} className="animate-spin" />} Stop it
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CampaignForm({
  draft,
  onChange,
  onSave,
  busy,
  error,
  editing,
}: {
  draft: CampaignInput;
  onChange: (next: CampaignInput) => void;
  onSave: () => void;
  busy: boolean;
  error: string | null;
  editing: boolean;
}) {
  const set = <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Name</span>
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Phones push, October"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">What affiliates are told (optional)</span>
        <textarea
          value={draft.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="Shown on their campaigns page"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Reward</span>
          <select
            value={draft.rewardType}
            onChange={(e) => set("rewardType", e.target.value as "percent" | "fixed")}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="percent">A percentage of the sale</option>
            <option value="fixed">A fixed amount per item</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">
            {draft.rewardType === "percent" ? "Percent" : "Naira per item"}
          </span>
          <input
            type="number"
            min={0}
            step={draft.rewardType === "percent" ? 0.5 : 100}
            value={draft.rewardValue}
            onChange={(e) => set("rewardValue", Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Starts (optional)</span>
          <input
            type="date"
            value={draft.startsAt ?? ""}
            onChange={(e) => set("startsAt", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Ends (optional)</span>
          <input
            type="date"
            value={draft.endsAt ?? ""}
            onChange={(e) => set("endsAt", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <ProductChooser
        chosen={draft.products}
        onChange={(products) => set("products", products)}
      />

      <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
        Commission is paid only on the products listed above. Delivery and anything else on the
        order earns nothing, which is deliberate.
        {editing && " Changing this campaign does not alter commission already earned."}
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">{error}</p>
      )}

      <button
        onClick={onSave}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        {editing ? "Save changes" : "Create campaign"}
      </button>
    </div>
  );
}

/** Search the catalogue and build the list of products a campaign rewards. */
function ProductChooser({
  chosen,
  onChange,
}: {
  chosen: CampaignProductRef[];
  onChange: (next: CampaignProductRef[]) => void;
}) {
  const [query, setQuery] = useState("");
  // Results are kept with the term they answer, so results for a term that
  // has since been typed over are simply not current — no clearing needed,
  // and no stale list flashing up for the wrong search.
  const [found, setFound] = useState<{ term: string; rows: ApiProduct[] }>({ term: "", rows: [] });

  const chosenIds = useMemo(() => new Set(chosen.map((p) => p.productId)), [chosen]);

  const term = query.trim();
  const canSearch = term.length >= 2;
  const results = canSearch && found.term === term ? found.rows : [];
  const searching = canSearch && found.term !== term;

  useEffect(() => {
    if (!canSearch) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchProducts({ search: term, perPage: 8 }, controller.signal)
        .then((page) => {
          if (!controller.signal.aborted) setFound({ term, rows: page.products });
        })
        .catch(() => undefined);
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, canSearch]);

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted">
        Products that earn the extra ({chosen.length})
      </span>

      {chosen.length > 0 && (
        <ul className="space-y-1">
          {chosen.map((p) => (
            <li
              key={`${p.productId}-${p.name}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5"
            >
              <span className="truncate text-sm text-foreground">{p.name}</span>
              <button
                type="button"
                onClick={() => onChange(chosen.filter((x) => x.productId !== p.productId))}
                aria-label={`Remove ${p.name}`}
                className="shrink-0 text-muted hover:text-danger"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <Search size={14} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalogue to add products…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        {searching && <Loader2 size={14} className="shrink-0 animate-spin text-muted" />}
      </div>

      {results.length > 0 && (
        <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {results.map((product) => {
            const already = chosenIds.has(product.id);
            return (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => {
                    onChange([
                      ...chosen,
                      { productId: product.id, productTmplId: null, name: product.name },
                    ]);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                    already ? "text-muted" : "text-foreground hover:bg-surface-2",
                  )}
                >
                  <span className="truncate">{product.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {already ? "added" : formatCurrency(product.price, product.currency)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
