import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/ui/InfoHint";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  delta,
  icon: Icon,
  tone = "neutral",
  info,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "neutral" | "up" | "down";
  /** What this figure counts, in the reader's terms. */
  info?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
          <span className="truncate">{label}</span>
          {info && <InfoHint label={label} text={info} />}
        </span>
        <span className="shrink-0 rounded-lg bg-surface-2 p-1.5 text-accent">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 truncate text-xl font-semibold text-foreground sm:text-2xl" title={value}>
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-1.5 text-xs font-medium",
            tone === "up" && "text-success",
            tone === "down" && "text-danger",
            tone === "neutral" && "text-muted"
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
