"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { MAX_MARKUP_PERCENT } from "@/lib/rules";
import { cn } from "@/lib/utils";

/**
 * Every answer below describes how the program actually behaves today. Where
 * something is not built yet, it says so rather than describing an intention
 * as though it were a rule.
 */
const FAQS = [
  {
    q: "How does my markup work?",
    a: `You choose a markup of up to ${MAX_MARKUP_PERCENT}%. Anyone who arrives through your link sees every product in the store priced that much higher, and the difference is what you earn. The markup travels with the link, so it applies to whatever they end up buying — not just the item you shared.`,
  },
  {
    q: "When is a sale recorded for me?",
    a: "As soon as the store confirms the customer has paid, the order is reported here and appears on your Earnings and Transactions pages. Nothing is counted before the money has actually landed.",
  },
  {
    q: "What do the earning statuses mean?",
    a: "Pending means the store has reported a paid order and it is awaiting review. Reversed means the order was later cancelled or refunded, so that money is not yours and is excluded from your totals. Approved and Paid are used once the review and payout steps exist.",
  },
  {
    q: "When do I get paid?",
    a: "Paying earnings out is still being built, so there is no payout schedule or minimum balance yet. Your earnings keep accruing and will be there when payouts open — you do not need to do anything now.",
  },
  {
    q: "How do I know which link drove a sale?",
    a: "Your Links & Codes page shows the number of paid orders and the amount earned for each individual link, so you can see which of your links is actually working.",
  },
  {
    q: "Can I use my own link for my own purchases?",
    a: "No. Buying through your own link is not eligible and may have its earnings reversed.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">How the affiliate program works, and where to get help.</p>

      <Card>
        <CardHeader title="Frequently asked questions" />
        <div className="divide-y divide-border">
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-medium text-foreground sm:p-5"
              >
                {f.q}
                <ChevronDown
                  size={16}
                  className={cn("shrink-0 text-muted transition-transform", openFaq === i && "rotate-180")}
                />
              </button>
              {openFaq === i && <p className="px-4 pb-4 text-sm text-muted sm:px-5">{f.a}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <span className="rounded-lg bg-surface-2 p-2 text-muted">
            <LifeBuoy size={16} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Raising a support request isn&apos;t available yet</p>
            <p className="text-xs text-muted">
              There is no ticket system connected to this dashboard yet, so please contact your CyberVilla
              contact directly for now. If your question is about a specific order, quote the order reference
              from your{" "}
              <Link href="/transactions" className="text-accent hover:underline">
                transactions
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
