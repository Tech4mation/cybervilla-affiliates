"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Plus, AlertCircle, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createAffiliateLink, fetchAffiliateLinks, type AffiliateLinkData } from "@/lib/api";
import {
  MAX_MARKUP_PERCENT,
  checkMarkupPercent,
} from "@/lib/rules";
import type { AffiliateLink } from "@/lib/types";
import { cn, copyToClipboard, formatCurrency, formatNumber } from "@/lib/utils";

const DEFAULT_MARKUP = 5;

/** The shareable address, with whatever campaign tags the affiliate typed. */
function withUtm(url: string, source: string, medium: string) {
  const parts = [
    source.trim() && `utm_source=${encodeURIComponent(source.trim())}`,
    medium.trim() && `utm_medium=${encodeURIComponent(medium.trim())}`,
  ].filter(Boolean);
  if (parts.length === 0) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${parts.join("&")}`;
}

function toLink(l: AffiliateLinkData): AffiliateLink {
  return {
    id: l.id,
    label: l.label,
    targetType: "Storewide",
    target: "Entire store",
    url: l.url,
    code: l.code,
    utm: undefined,
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
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [markup, setMarkup] = useState<string>(String(DEFAULT_MARKUP));
  const [label, setLabel] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [generated, setGenerated] = useState<AffiliateLink | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const markupNum = Number(markup);

  // Starts with the request, so nothing is set synchronously when the effect
  // below runs it; every state change happens once the response is in.
  function load() {
    return fetchAffiliateLinks()
      .then(({ links: apiLinks }) => {
        setLinks(apiLinks.map(toLink));
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
  // A 0% link earns the affiliate nothing, so it is not something to create by
  // accident by clearing the box.
  const usableMarkup = markup.trim() !== "" && markupNum > 0;
  const valid = check.ok;

  async function handleGenerate() {
    // An empty box reads as 0, which would silently create a link the
    // affiliate earns nothing on.
    if (!markup.trim() || markupNum <= 0 || !valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { link: apiLink } = await createAffiliateLink({
        markupPercent: markupNum,
        label: label.trim() || `${markupNum}% markup${utmSource.trim() ? ` · ${utmSource.trim()}` : ""}`,
      });
      const newLink = toLink(apiLink);
      setLinks((prev) => [newLink, ...prev]);
      setGenerated({ ...newLink, url: withUtm(newLink.url, utmSource, utmMedium) });
      setLabel("");
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
        yours. Your markup travels with the link, so it applies to whatever they end up buying through it.
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
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">Link name (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Instagram bio"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">UTM source (optional)</label>
            <input
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="instagram"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">UTM medium (optional)</label>
            <input
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              placeholder="bio"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
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
                <span className="text-xs font-medium text-success">
                  Everything bought through this link sells for {markupNum}% more, and that {markupNum}% is yours
                </span>
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
            disabled={!valid || !usableMarkup || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {submitting ? "Generating…" : "Generate Link & Code"}
          </button>
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
                The address carries only your code{generated.url.includes("utm_") ? " and your campaign tags" : ""}.
                The price it stands for is looked up when someone opens it, so nobody can change it on the way
                through.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Your links & codes" subtitle={`${links.length} generated`} />
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
                    <span className="text-foreground">+{l.markupPercent ?? 0}% on everything</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{formatNumber(l.sales)}</td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(l.earnings ?? l.commissions, l.currency ?? null)}</td>
                  <td className="px-4 py-3">
                    <Badge status={l.status}>{l.status}</Badge>
                  </td>
                  <td className="px-4 py-3 sm:pr-5">
                    <CopyButton text={l.url} />
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
  return <LinksContent />;
}
