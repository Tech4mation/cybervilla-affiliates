"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Landmark, Search } from "lucide-react";
import { fetchBanks, type Bank } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Pick the bank a payout goes to.
 *
 * A plain dropdown is wrong here: there are over 250 banks, most of them
 * microfinance names that look alike, and picking the one next to the one you
 * meant sends somebody else's money somewhere it cannot be recalled. So the
 * list is searchable and the choice is always shown back in full.
 *
 * The code is what gets submitted. The name is only ever for the reader —
 * two banks can read almost identically and only the code is unambiguous.
 */
export function BankPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (bank: Bank | null) => void;
  disabled?: boolean;
}) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBanks()
      .then((page) => {
        if (!cancelled) setBanks(page.banks);
      })
      .catch(() => {
        if (!cancelled) setLoadError("We could not load the bank list. Please try again shortly.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Clicking anywhere else closes the list, which is what everyone expects
  // and what keyboard users get from Escape.
  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  const selected = useMemo(() => banks.find((b) => b.code === value) ?? null, [banks, value]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return banks.slice(0, 50);
    return banks.filter((b) => b.name.toLowerCase().includes(needle)).slice(0, 50);
  }, [banks, query]);

  if (loadError) {
    return <p className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">{loadError}</p>;
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={disabled || banks.length === 0}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm text-foreground disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Landmark size={14} className="shrink-0 text-muted" />
          <span className={cn("truncate", !selected && "text-muted")}>
            {selected ? selected.name : banks.length === 0 ? "Loading banks…" : "Choose your bank"}
          </span>
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
              placeholder="Search banks…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto">
            {matches.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted">No bank matches that.</li>
            )}
            {matches.map((bank) => (
              <li key={bank.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={bank.code === value}
                  onClick={() => {
                    onChange(bank);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2"
                >
                  <span className="truncate">{bank.name}</span>
                  {bank.code === value && <Check size={14} className="shrink-0 text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
