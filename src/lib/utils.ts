export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Money, in the currency it is actually priced in.
 *
 * Products come from the store with their own currency, so passing null prints
 * the figure bare rather than dressing it up in a symbol nobody quoted. The
 * NGN default is for the screens still running on mock data.
 */
export function formatCurrency(amount: number, currency: string | null = "NGN") {
  if (!currency) {
    return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(amount);
  }
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unrecognised code would otherwise throw and take the page down with it.
    return `${currency} ${formatNumber(amount)}`;
  }
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-NG").format(n);
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Put text on the clipboard, reporting honestly whether it worked.
 *
 * `navigator.clipboard` exists only in a secure context, so on a plain-http
 * deployment it is undefined and the modern call throws. The old
 * `execCommand` path still works there, and if both fail the caller is told,
 * rather than showing a "Copied" tick over an untouched clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through and try the legacy path.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    // Off-screen but still focusable; `display: none` cannot be selected.
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

export function downloadFile(content: string, filename: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
