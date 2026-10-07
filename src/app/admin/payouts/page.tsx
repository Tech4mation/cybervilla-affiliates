"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, KeyRound, Loader2, RefreshCw, Send, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Toolbar";
import { Modal } from "@/components/ui/Modal";
import {
  confirmPayoutOtp,
  fetchAdminPayouts,
  markPayoutFailed,
  markPayoutPaid,
  reconcilePayout,
  resendPayoutOtp,
  sendPayout,
  type PayoutRecord,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUSES = ["all", "requested", "awaiting_otp", "processing", "paid", "failed", "cancelled"];

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Marking a payout paid is a claim that money left the bank, so it asks for
  // the transfer reference rather than being a bare button.
  const [settling, setSettling] = useState<PayoutRecord | null>(null);
  const [transferRef, setTransferRef] = useState("");
  const [failing, setFailing] = useState<PayoutRecord | null>(null);
  const [failReason, setFailReason] = useState("");

  // Sending is the only button here that moves money, so it is confirmed
  // separately from recording a transfer somebody already made.
  const [sending, setSending] = useState<PayoutRecord | null>(null);
  const [otpFor, setOtpFor] = useState<PayoutRecord | null>(null);
  const [otp, setOtp] = useState("");
  const [otpNote, setOtpNote] = useState<string | null>(null);

  function load(forStatus = status) {
    return fetchAdminPayouts(forStatus)
      .then((p) => {
        setPayouts(p.payouts);
        setError(null);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load payouts."),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);


  async function handleSend() {
    if (!sending) return;
    setBusy(sending.id);
    try {
      const { payout } = await sendPayout(sending.id);
      setSending(null);
      // Paystack is holding it for a code: ask for that straight away rather
      // than leaving the admin to notice a new status in the table.
      if (payout.awaitingOtp) {
        setOtpFor(payout);
        setOtpNote("Paystack has sent a code to the account owner.");
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send that payout.");
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirmOtp() {
    if (!otpFor || !otp.trim()) return;
    setBusy(otpFor.id);
    setOtpNote(null);
    try {
      await confirmPayoutOtp(otpFor.id, otp.trim());
      setOtpFor(null);
      setOtp("");
      await load();
    } catch (reason) {
      // A wrong code is correctable: keep the dialog open and say so there,
      // rather than closing it and putting the message somewhere else.
      setOtpNote(reason instanceof Error ? reason.message : "That code was not accepted.");
    } finally {
      setBusy(null);
    }
  }

  async function handleResendOtp() {
    if (!otpFor) return;
    setBusy(otpFor.id);
    setOtpNote(null);
    try {
      await resendPayoutOtp(otpFor.id);
      setOtpNote("A new code has been sent.");
    } catch (reason) {
      setOtpNote(reason instanceof Error ? reason.message : "Could not send a new code.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReconcile(payout: PayoutRecord) {
    setBusy(payout.id);
    try {
      await reconcilePayout(payout.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not check that payout.");
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkPaid() {
    if (!settling) return;
    setBusy(settling.id);
    try {
      await markPayoutPaid(settling.id, { reference: transferRef.trim() });
      setSettling(null);
      setTransferRef("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record that payment.");
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkFailed() {
    if (!failing || !failReason.trim()) return;
    setBusy(failing.id);
    try {
      await markPayoutFailed(failing.id, failReason.trim());
      setFailing(null);
      setFailReason("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not record that failure.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Affiliates request a payout from what they have earned; you vet it and release it here.{" "}
        <strong className="font-medium text-foreground">Send now</strong> moves the money through
        Paystack, which asks for a confirmation code before it goes.{" "}
        <strong className="font-medium text-foreground">Record manual</strong> is only for a transfer
        you made from the bank yourself.
      </p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={status} onChange={setStatus} options={STATUSES} />
        <span className="text-xs text-muted sm:ml-auto">
          {loading ? "Loading…" : `${payouts.length} payout${payouts.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <Card>
        <CardHeader title="Payouts" subtitle="Requested by affiliates" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Payout</th>
                <th className="px-4 py-3 font-medium">Affiliate</th>
                <th className="px-4 py-3 font-medium">Send to</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium sm:pr-5" />
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 sm:px-5">
                    <p className="font-medium text-foreground">{p.id}</p>
                    <p className="text-xs text-muted">
                      {p.requestedAt ? formatDate(p.requestedAt) : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{p.affiliateName || "—"}</p>
                    <p className="text-xs text-muted">{p.affiliateRef}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <p className="text-foreground">{p.bankName || "—"}</p>
                    <p>{p.accountName}</p>
                    <p className="font-mono">•••• {p.accountNumberLast4}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.orderCount}</td>
                  <td className="px-4 py-3 font-medium text-accent tabular-nums">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={p.status}>{p.status}</Badge>
                    {p.failureReason && <p className="mt-1 text-[11px] text-danger">{p.failureReason}</p>}
                  </td>
                  <td className="px-4 py-3 sm:pr-5">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === "requested" && (
                        <>
                          <button
                            onClick={() => setSending(p)}
                            disabled={busy === p.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
                          >
                            {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Send now
                          </button>
                          <button
                            onClick={() => setSettling(p)}
                            disabled={busy === p.id}
                            title="Record a transfer you made yourself"
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                          >
                            <Check size={13} /> Record manual
                          </button>
                        </>
                      )}
                      {p.awaitingOtp && (
                        <button
                          onClick={() => {
                            setOtpFor(p);
                            setOtp("");
                            setOtpNote(null);
                          }}
                          disabled={busy === p.id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
                        >
                          <KeyRound size={13} /> Enter code
                        </button>
                      )}
                      {p.status === "processing" && (
                        <button
                          onClick={() => handleReconcile(p)}
                          disabled={busy === p.id}
                          title="Ask Paystack where this transfer got to"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                        >
                          {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                          Check
                        </button>
                      )}
                      {(p.status === "requested" || p.awaitingOtp) && (
                        <button
                          onClick={() => setFailing(p)}
                          disabled={busy === p.id}
                          title="Mark as failed"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-danger hover:text-danger disabled:opacity-50"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                    {loading
                      ? "Loading payouts…"
                      : error
                        ? "Payouts could not be loaded — see the message above."
                        : "No payouts have been requested yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={Boolean(sending)} onClose={() => setSending(null)} title="Send this payout">
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-foreground">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-danger" />
            <span>
              This <strong>moves money</strong> through Paystack. It is not a record of a transfer you
              made yourself &mdash; use &ldquo;Record manual&rdquo; for that.
            </span>
          </div>
          {sending && (
            <p className="text-sm text-foreground">
              {formatCurrency(sending.amount, sending.currency)} to {sending.accountName} ({sending.bankName}{" "}
              &bull;&bull;&bull;&bull; {sending.accountNumberLast4})
            </p>
          )}
          <p className="text-xs text-muted">
            Paystack may ask for a confirmation code sent to the account owner. If it does, you will be
            asked for it next.
          </p>
          <button
            onClick={handleSend}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send the money
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(otpFor)} onClose={() => setOtpFor(null)} title="Confirmation code">
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Paystack sends this code to the Paystack account owner, not to the affiliate. The transfer
            stays on hold until it is entered.
          </p>
          {otpFor && (
            <p className="text-sm text-foreground">
              {otpFor.id} &mdash; {formatCurrency(otpFor.amount, otpFor.currency)} to {otpFor.accountName}
            </p>
          )}
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoFocus
            placeholder="000000"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          {otpNote && <p className="text-xs text-muted">{otpNote}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmOtp}
              disabled={!otp.trim() || Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Confirm
            </button>
            <button
              onClick={handleResendOtp}
              disabled={Boolean(busy)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
            >
              Send a new code
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(settling)} onClose={() => setSettling(null)} title="Record this payout as sent">
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-accent" />
            This records that you have already sent the money. It does not send anything. Only do this
            once the transfer has actually left the bank.
          </div>
          {settling && (
            <p className="text-sm text-foreground">
              {formatCurrency(settling.amount, settling.currency)} to {settling.accountName} ({settling.bankName}{" "}
              •••• {settling.accountNumberLast4})
            </p>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted">Bank transfer reference (optional)</span>
            <input
              value={transferRef}
              onChange={(e) => setTransferRef(e.target.value)}
              placeholder="So this can be matched to the bank statement later"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </label>
          <button
            onClick={handleMarkPaid}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Yes, I have sent it
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(failing)} onClose={() => setFailing(null)} title="Mark this payout as failed">
        <div className="space-y-3">
          <p className="text-xs text-muted">
            The earnings in this payout go back to being payable, so they can be sent in a later attempt.
            The failed attempt stays on the record.
          </p>
          <textarea
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            rows={3}
            placeholder="What went wrong? The affiliate sees this."
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleMarkFailed}
            disabled={!failReason.trim() || Boolean(busy)}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Mark as failed
          </button>
        </div>
      </Modal>
    </div>
  );
}
