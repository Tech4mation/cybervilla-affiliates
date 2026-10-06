"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The small "what is this?" marker that sits beside a figure.
 *
 * The bubble is positioned fixed and measured from the icon rather than being
 * laid out inside the card. A card is only a couple of hundred pixels wide on
 * a phone, so an absolutely-positioned bubble either overflowed the card or
 * got clipped by it; measuring lets the text stay readable and stay on screen
 * wherever the card happens to sit in the grid.
 */

/** What the bubble is laid out at, and what the edge clamp is measured against. */
const WIDTH = 240;
const GUTTER = 12;

export function InfoHint({
  label,
  text,
  className,
  children,
  triggerClassName,
}: {
  /** The figure this explains. Only used to name the button for screen readers. */
  label: string;
  text: string;
  className?: string;
  /**
   * What the reader hovers. Defaults to the small "i" marker; pass something
   * else — a tag, a figure — to hang the same bubble off that instead. One
   * implementation, because the fiddly parts (touch, keyboard, staying on
   * screen) are worth getting right once.
   */
  children?: ReactNode;
  triggerClassName?: string;
}) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const open = position !== null;

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    // Centred under the icon, then pulled back inside whichever edge it would
    // otherwise cross.
    const centred = rect.left + rect.width / 2 - WIDTH / 2;
    const rightLimit = window.innerWidth - WIDTH - GUTTER;
    setPosition({ top: rect.bottom + 8, left: Math.max(GUTTER, Math.min(centred, rightLimit)) });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) close();
    };
    // The placement is measured once, so anything that moves the icon has to
    // dismiss the bubble rather than leave it pointing at empty space.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={buttonRef}
        type="button"
        // With custom content the button already reads as itself; an
        // aria-label here would override that with something vaguer.
        aria-label={children ? undefined : `What "${label}" means`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => (open ? setPosition(null) : place())}
        // Hover is for mice only. On a touch screen the browser fires a
        // synthetic enter before the tap, which would open the bubble and let
        // the tap that followed close it again.
        onPointerEnter={(event) => event.pointerType === "mouse" && place()}
        onPointerLeave={(event) => event.pointerType === "mouse" && setPosition(null)}
        onFocus={place}
        onBlur={() => setPosition(null)}
        className={cn(
          "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent",
          children ? "rounded-full" : "rounded-full p-0.5 text-muted hover:text-foreground",
          triggerClassName,
        )}
      >
        {children ?? <Info size={13} />}
      </button>
      {position && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{ top: position.top, left: position.left, width: WIDTH }}
          // The labels these sit next to are uppercase and letter-spaced, so
          // the bubble resets its own typography rather than inheriting theirs.
          className="fixed z-50 rounded-lg border border-border bg-background p-2.5 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-muted shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
