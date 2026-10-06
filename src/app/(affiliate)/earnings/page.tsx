"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Download, FileText, Info, Loader2, Landmark, Send } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AmountTile } from "@/components/ui/AmountTile";
import { BankPicker } from "@/components/ui/BankPicker";
import {
  fetchAffiliateEarnings,
  fetchPayoutAccount,
  fetchPayouts,
  getCurrentUser,
  requestPayout,
  resolveAccountName,
  savePayoutAccount,
  type AffiliateEarning,
  type PayoutAccount,
  type PayoutBalance,
  type PayoutRecord,
} from "@/lib/api";
import { cn, downloadFile, formatCurrency, formatDate, toCsv } from "@/lib/utils";

export default function EarningsPage() {
  const [user, setUser] = useState<{ name: string; id: string; email: string } | null>(null);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [editingAccount, setEditingAccount] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  // Each result is stored with the bank and number it belongs to, so an
  // answer for details that have since been edited is simply no longer
  // current rather than something that has to be cleared in time.
  const [resolution, setResolution] = useState<{ key: string; name: string } | null>(null);
  const [resolveFailure, setResolveFailure] = useState<{ key: string; message: string } | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  function loadPayouts() {
    return Promise.all([fetchPayouts(), fetchPayoutAccount()])
      .then(([p, a]) => {
        setPayouts(p.payouts);
        setBalance(p.balance);
        setAccount(a.account);
        setBankCode(a.account.bankCode);
        // Never prefilled: we only ever hold the last four digits.
        setAccountNumber("");
        setResolution(null);
        setResolveFailure(null);
        setEditingAccount(!a.account.complete);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    Promise.all([getCurrentUser(), fetchAffiliateEarnings()])
      .then(([{ user }, { earnings }]) => {
        setUser({ name: user.name, id: String(user.id), email: user.email });
        setEarnings(earnings);
        void loadPayouts();
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load your earnings."),
      )
      .finally(() => setLoading(false));
  }, []);

  const currency = useMemo(() => earnings.find((row) => row.currency)?.currency ?? null, [earnings]);

  // What the bank says about the account currently typed in. Derived rather
  // than stored, so a slow reply about an older number can never be mistaken
  // for an answer about this one.
  const resolveKey = `${bankCode}:${accountNumber}`;
  const canResolve = Boolean(bankCode) && accountNumber.length >= 8;
  const resolvedName = resolution?.key === resolveKey ? resolution.name : "";
  const resolveError = resolveFailure?.key === resolveKey ? resolveFailure.message : null;
  const resolving = canResolve && !resolvedName && !resolveError;

  useEffect(() => {
    if (!canResolve) return;
    const controller = new AbortController();
    // A pause before asking: this runs on every keystroke, and the account
    // number is only meaningful once they have stopped typing it.
    const timer = setTimeout(() => {
      resolveAccountName({ accountNumber, bankCode }, controller.signal)
        .then((result) => setResolution({ key: resolveKey, name: result.accountName }))
        .catch((reason) => {
          if (controller.signal.aborted) return;
          setResolveFailure({
            key: resolveKey,
            message: reason instanceof Error ? reason.message : "We couldn't confirm that account.",
          });
        });
    }, 500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // accountNumber and bankCode are already what resolveKey is made of, so
    // they add no extra runs; they are listed to satisfy the linter.
  }, [resolveKey, canResolve, accountNumber, bankCode]);

  // Each state is counted on its own. A reversed earning — an order that was
  // cancelled or refunded — is money that never arrives, so it is reported
  // apart from the rest rather than folded into a total.
  // An affiliate is owed markup plus any campaign commission, so every
  // figure here counts both. `totalDue` is absent on rows recorded before
  // campaigns existed, where the markup alone is the whole of it.
  const breakdown = useMemo(
    () =>
      earnings.reduce(
        (acc, e) => {
          const due = e.totalDue ?? e.earning;
          if (e.status === "pending") acc.pending += due;
          else if (e.status === "approved" || e.status === "payable") acc.approved += due;
          else if (e.status === "paid") acc.paid += due;
          else if (e.status === "reversed") acc.reversed += due;
          if (e.status !== "reversed") acc.commission += e.commission ?? 0;
          return acc;
        },
        { pending: 0, approved: 0, paid: 0, reversed: 0, commission: 0 },
      ),
    [earnings],
  );

  async function handleSaveAccount(event: React.FormEvent) {
    event.preventDefault();
    setSavingAccount(true);
    setPayoutError(null);
    try {
      const { account: saved } = await savePayoutAccount({ accountNumber, bankCode });
      setAccount(saved);
      setAccountNumber("");
      setEditingAccount(false);
      await loadPayouts();
    } catch (reason) {
      setPayoutError(reason instanceof Error ? reason.message : "Could not save those details.");
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleRequestPayout() {
    if (!balance?.canRequest || requesting) return;
    setRequesting(true);
    setPayoutError(null);
    try {
      await requestPayout();
      await loadPayouts();
    } catch (reason) {
      setPayoutError(reason instanceof Error ? reason.message : "Could not request that payout.");
    } finally {
      setRequesting(false);
    }
  }

  function exportStatement() {
    if (!user) return;
    const year = new Date().getFullYear();
    downloadFile(
      [
        "CyberVilla Affiliate Earnings Statement",
        `Affiliate: ${user.name} (${user.id})`,
        `Generated: ${new Date().toISOString().slice(0, 10)}`,
        "",
        `Paid:     ${formatCurrency(breakdown.paid, currency)}`,
        `Approved: ${formatCurrency(breakdown.approved, currency)}`,
        `Pending:  ${formatCurrency(breakdown.pending, currency)}`,
        `Reversed: ${formatCurrency(breakdown.reversed, currency)}`,
      ].join("\n"),
      `cybervilla-earnings-statement-${year}.txt`,
      "text/plain",
    );
  }

  function exportHistory() {
    downloadFile(
      toCsv(
        earnings.map((e) => ({
          order_ref: e.orderRef,
          date: e.occurredAt ?? "",
          currency: e.currency ?? "",
          amount_total: e.amountTotal,
          earning: e.earning,
          status: e.status,
        })),
      ),
      `cybervilla-earnings-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading earnings...</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">What you have earned, as the store has reported it.</p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error} — this is a loading problem, not an empty account.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AmountTile
          label="Pending"
          amount={breakdown.pending}
          tone="pending"
          currency={currency}
          note={breakdown.pending ? "Recorded from paid orders." : undefined}
          info="Earned from orders the store has confirmed as paid, but still settling. Earnings wait here until the order is old enough to be unlikely to come back."
        />
        <AmountTile
          label="Approved"
          amount={breakdown.approved}
          tone="approved"
          currency={currency}
          note={breakdown.approved ? undefined : "Nothing approved yet."}
          info="Cleared and counted as yours. This is the money a payout request draws on, once it reaches the minimum shown below."
        />
        <AmountTile
          label="Paid"
          amount={breakdown.paid}
          tone="paid"
          currency={currency}
          note={breakdown.paid ? undefined : "Nothing paid out yet."}
          info="Already transferred to your bank account. Every payout that made it up is listed under Payout history."
        />
        <AmountTile
          label="Reversed"
          amount={breakdown.reversed}
          tone="reversed"
          currency={currency}
          note={breakdown.reversed ? "Cancelled or refunded orders." : undefined}
          info="From orders that were later cancelled or refunded. That money is not yours, so it is left out of every other figure on this page."
        />
      </div>

      {breakdown.commission > 0 && (
        <p className="text-xs text-muted">
          Includes{" "}
          <span className="font-medium text-accent">
            {formatCurrency(breakdown.commission, currency)}
          </span>{" "}
          of campaign commission, earned on top of your markup. Each order&apos;s split is on the
          Transactions page.
        </p>
      )}

      {payoutError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {payoutError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ready to be paid" subtitle="Approved earnings not yet paid out" />
          <div className="space-y-3 p-4 sm:p-5">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(balance?.amount ?? 0, balance?.currency ?? currency)}
            </p>
            {balance && (
              <p className="text-xs text-muted">
                From {balance.orderCount} order{balance.orderCount === 1 ? "" : "s"} · minimum payout{" "}
                {formatCurrency(balance.minimum, balance.currency ?? currency)}
              </p>
            )}
            <button
              onClick={handleRequestPayout}
              disabled={!balance?.canRequest || requesting}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {requesting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {requesting ? "Requesting…" : "Request payout"}
            </button>
            {balance?.canRequest && (
              // Without this the button looks like it pays you on the spot,
              // and the wait that follows looks like something went wrong.
              <p className="text-xs text-muted">
                Requesting sends this to CyberVilla to release. You&apos;ll be notified once the
                transfer has gone out.
              </p>
            )}
            {balance && !balance.canRequest && balance.blockedBy.length > 0 && (
              <ul className="space-y-1 text-xs text-muted">
                {balance.blockedBy.map((reason) => (
                  <li key={reason} className="flex items-start gap-1.5">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-border pt-3 text-[11px] text-muted">
              An earning becomes approved once its order is old enough to be unlikely to come back.
              Payouts are sent by bank transfer and recorded here.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Where your money goes"
            subtitle="The account your payouts are sent to"
            action={
              account?.complete && !editingAccount ? (
                <button
                  onClick={() => setEditingAccount(true)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                >
                  Change
                </button>
              ) : undefined
            }
          />
          <div className="p-4 sm:p-5">
            {account?.complete && !editingAccount ? (
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-foreground">
                  <Landmark size={14} className="text-muted" /> {account.bankName}
                </p>
                <p className="text-foreground">{account.accountName}</p>
                <p className="font-mono text-muted">•••• {account.accountNumberLast4}</p>
              </div>
            ) : (
              <form onSubmit={handleSaveAccount} className="space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted">Bank</span>
                  <BankPicker
                    value={bankCode}
                    onChange={(bank) => setBankCode(bank?.code ?? "")}
                    disabled={savingAccount}
                  />
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted">Account number</span>
                  <input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    disabled={savingAccount}
                    placeholder={account?.accountNumberLast4 ? `•••• ${account.accountNumberLast4}` : "0123456789"}
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </label>

                {/* The whole point of the form: the affiliate sees the name on
                    the account before anything is saved, and catches their own
                    typo while it is still free to fix. */}
                <div
                  aria-live="polite"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    resolvedName
                      ? "border-success/30 bg-success/10 text-foreground"
                      : resolveError
                        ? "border-danger/30 bg-danger/10 text-danger"
                        : "border-border bg-surface-2 text-muted",
                  )}
                >
                  {resolving ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" /> Checking with the bank…
                    </span>
                  ) : resolvedName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <BadgeCheck size={14} className="shrink-0 text-success" />
                      <span className="font-medium">{resolvedName}</span>
                    </span>
                  ) : resolveError ? (
                    resolveError
                  ) : (
                    "Pick your bank and type the account number — we'll confirm the name on it."
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingAccount || !resolvedName}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-strong disabled:opacity-50"
                  >
                    {savingAccount && <Loader2 size={14} className="animate-spin" />}
                    {savingAccount ? "Saving…" : "Save account"}
                  </button>
                  {account?.complete && (
                    <button
                      type="button"
                      onClick={() => setEditingAccount(false)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted">
                  Re-enter the full account number to change it — only the last four digits are kept here.
                </p>
              </form>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Payout history" subtitle={`${payouts.length} payout${payouts.length === 1 ? "" : "s"}`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Payout</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground sm:px-5">{p.id}</td>
                  <td className="px-4 py-3 text-muted">{p.requestedAt ? formatDate(p.requestedAt) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.orderCount}</td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 sm:pr-5">
                    <Badge status={p.status}>{p.status}</Badge>
                    {p.failureReason && (
                      <p className="mt-1 text-[11px] text-danger">{p.failureReason}</p>
                    )}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">
                    No payouts yet. Once your approved earnings reach the minimum, you can request one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Earnings history"
          subtitle={`${earnings.length} recorded ${earnings.length === 1 ? "order" : "orders"}`}
          action={
            <button
              onClick={exportStatement}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
            >
              <FileText size={13} /> Earnings statement
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium sm:px-5">Order</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Earning</th>
                <th className="px-4 py-3 font-medium sm:pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.orderRef} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground sm:px-5">{e.orderRef}</td>
                  <td className="px-4 py-3 text-muted">{e.occurredAt ? formatDate(e.occurredAt) : "—"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(e.amountTotal, e.currency)}</td>
                  <td className="px-4 py-3 font-medium text-accent">{formatCurrency(e.earning, e.currency)}</td>
                  <td className="px-4 py-3 sm:pr-5">
                    <Badge status={e.status}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
              {earnings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    {error
                      ? "Your earnings could not be loaded — see the message above."
                      : "No earnings recorded yet. They appear here once a customer buys through your link."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {earnings.length > 0 && (
          <div className="flex justify-end border-t border-border p-3">
            <button
              onClick={exportHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
            >
              <Download size={13} /> Export history
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

