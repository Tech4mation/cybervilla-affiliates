import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-info/10 text-info border-info/30",
  accent: "bg-accent text-black border-accent",
};

const statusTone: Record<string, Tone> = {
  active: "success",
  approved: "success",
  paid: "success",
  completed: "success",
  resolved: "success",
  pending: "warning",
  processing: "warning",
  open: "warning",
  in_progress: "info",
  expired: "neutral",
  unavailable: "neutral",
  unpaid: "neutral",
  rejected: "danger",
  cancelled: "danger",
  refunded: "danger",
  failed: "danger",
  // States the backend genuinely emits. Without these, a reversed (refunded)
  // earning was styled the same as an expired promotion.
  reversed: "danger",
  suspended: "danger",
  payable: "info",
  inactive: "neutral",
};

export function Badge({
  children,
  tone,
  status,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  status?: string;
  className?: string;
}) {
  const resolvedTone = tone ?? (status ? statusTone[status] ?? "neutral" : "neutral");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        toneStyles[resolvedTone],
        className
      )}
    >
      {children}
    </span>
  );
}
