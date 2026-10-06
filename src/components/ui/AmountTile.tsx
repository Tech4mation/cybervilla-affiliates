import { cn, formatCurrency } from "@/lib/utils";
import { InfoHint } from "@/components/ui/InfoHint";

export type AmountTone = "pending" | "approved" | "paid" | "reversed";

/**
 * One money figure with the state it belongs to.
 *
 * The state is carried by a small coloured dot rather than a badge, because a
 * badge next to the label just repeated the same word twice ("Pending
 * Pending"). A zero is dimmed so a row of empty states doesn't compete with
 * the figure that actually matters.
 */
const dotTone: Record<AmountTone, string> = {
  pending: "bg-warning",
  approved: "bg-success",
  paid: "bg-success",
  reversed: "bg-danger",
};

export function AmountTile({
  label,
  amount,
  tone,
  currency,
  note,
  info,
}: {
  label: string;
  amount: number;
  tone: AmountTone;
  currency: string | null;
  /** Why this figure is what it is — shown only when there's something to say. */
  note?: string;
  /** What this figure means, for anyone who has not been told. */
  info?: string;
}) {
  const empty = !amount;

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", empty ? "bg-border" : dotTone[tone])}
        />
        <span className="truncate text-xs font-medium text-muted">{label}</span>
        {info && <InfoHint label={label} text={info} />}
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tabular-nums",
          empty ? "text-muted" : "text-foreground",
        )}
      >
        {formatCurrency(amount, currency)}
      </p>
      {note && <p className="mt-1 text-[11px] leading-snug text-muted">{note}</p>}
    </div>
  );
}
