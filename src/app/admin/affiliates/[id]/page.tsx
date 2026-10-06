"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  approveAffiliateApi,
  fetchAdminAffiliate,
  rejectAffiliateApi,
  type AdminAffiliateDetail,
} from "@/lib/api";
import { useAppData } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminAffiliateDetailPage() {
  const params = useParams<{ id: string }>();
  const { reloadAffiliates } = useAppData();
  const [data, setData] = useState<AdminAffiliateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    void fetchAdminAffiliate(Number(params.id))
      .then(setData)
      .catch((error) => setActionError(error instanceof Error ? error.message : "Could not load this application."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading application...</div>;
  if (!data) return <div className="p-8 text-center text-sm text-danger">{actionError ?? "Affiliate not found or unavailable."}</div>;

  const { affiliate, links, earnings } = data;
  const detail = data;
  const isPending = affiliate.status === "pending";

  async function approve() {
    setActionLoading(true);
    setActionError(null);
    try {
      await approveAffiliateApi(affiliate.id);
      setData({ ...detail, affiliate: { ...affiliate, status: "approved", isMember: true } });
      // The list behind this page is held in a provider that outlives it, so
      // without this the admin goes back and still sees them as pending.
      await reloadAffiliates();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not approve this application.");
    } finally {
      setActionLoading(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await rejectAffiliateApi(affiliate.id, reason.trim());
      setData({ ...detail, affiliate: { ...affiliate, status: "rejected", rejectionReason: reason.trim() } });
      setRejecting(false);
      setReason("");
      await reloadAffiliates();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not reject this application.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/affiliates" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={15} /> Back to affiliates
      </Link>
      {actionError && <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{actionError}</div>}
      <Card>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-base font-semibold text-foreground">{affiliate.name}</p>
            <p className="text-sm text-muted">{affiliate.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge status={affiliate.status}>{affiliate.status}</Badge>
              <span className="text-xs text-muted">
                {affiliate.joinedAt ? formatDate(affiliate.joinedAt) : "Join date unknown"}
              </span>
              {affiliate.affiliateRef && <span className="text-xs text-muted">{affiliate.affiliateRef}</span>}
            </div>
          </div>
          {isPending && (
            <div className="flex gap-2">
              <button onClick={approve} disabled={actionLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"><Check size={15} /> {actionLoading ? "Saving..." : "Approve"}</button>
              <button onClick={() => setRejecting(true)} disabled={actionLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"><X size={15} className="text-danger" /> Reject</button>
            </div>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader title="Application" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="space-y-3 text-sm">
            <p><span className="text-muted">Phone:</span> {affiliate.phone || "Not provided"}</p>
          </div>
          <p className="text-sm text-foreground">{affiliate.whyJoin || "No application statement provided."}</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="Affiliate links" subtitle={`${links.length} backend records`} />
        <div className="divide-y divide-border">
          {links.map((link) => <div key={link.id} className="flex items-center justify-between gap-3 p-4 text-sm"><div><p className="font-medium">{link.label || link.code}</p><p className="text-xs text-muted">{link.targetType} · {link.markupPercent}% markup</p></div><Badge status={link.synced ? "active" : "pending"}>{link.synced ? "synced" : "pending"}</Badge></div>)}
          {!links.length && <p className="p-5 text-sm text-muted">No links recorded.</p>}
        </div>
      </Card>
      <Card>
        <CardHeader title="Earnings" subtitle={`${earnings.length} store-reported records`} />
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted"><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Order total</th><th className="px-4 py-3">Earning</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{earnings.map((earning) => <tr key={earning.orderRef} className="border-b border-border last:border-0"><td className="px-4 py-3">{earning.orderRef}</td><td className="px-4 py-3 text-muted">{earning.occurredAt ? formatDate(earning.occurredAt) : "—"}</td><td className="px-4 py-3">{formatCurrency(earning.amountTotal, earning.currency)}</td><td className="px-4 py-3 font-medium text-accent">{formatCurrency(earning.earning, earning.currency)}</td><td className="px-4 py-3"><Badge status={earning.status}>{earning.status}</Badge></td></tr>)}{!earnings.length && <tr><td colSpan={5} className="p-5 text-center text-sm text-muted">No earnings recorded.</td></tr>}</tbody></table></div>
      </Card>
      <Modal open={rejecting} onClose={() => setRejecting(false)} title="Reject application">
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" placeholder="Reason for rejection" />
        <button onClick={reject} disabled={!reason.trim()} className="mt-3 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Reject application</button>
      </Modal>
    </div>
  );
}
