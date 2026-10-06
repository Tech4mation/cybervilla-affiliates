"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { fetchAffiliateRules, type AffiliateRules } from "@/lib/api";
import { MAX_MARKUP_PERCENT } from "@/lib/rules";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Help text for the programme as it behaves today.
 *
 * Two rules for anything written here. The numbers come from the server, so
 * changing a cap in config cannot leave this page quietly misquoting it. And
 * where something is not built — email alerts, support tickets — it says so
 * rather than describing an intention as though it were a rule. An earlier
 * version of this page was still telling affiliates there was no way to be
 * paid long after there was one, which is the failure worth designing against.
 */

/** Shown until the live rules load, and if they cannot be fetched at all. */
const FALLBACK_RULES: AffiliateRules = {
  maxMarkupPercent: MAX_MARKUP_PERCENT,
  maxLinks: 4,
  minPayout: 50000,
  holdDays: 5,
};

interface Faq {
  id: string;
  q: string;
  a: string;
}

function faqSections(rules: AffiliateRules): { title: string; faqs: Faq[] }[] {
  const minimum = formatCurrency(rules.minPayout);
  // The waiting period is configurable and can be set to nothing at all, in
  // which case "the order is 0 days old" would be gibberish.
  const waiting =
    rules.holdDays > 0
      ? `An earning can only be approved once the order is ${rules.holdDays} ` +
        `${rules.holdDays === 1 ? "day" : "days"} old, because until then the customer ` +
        "could still cancel or return it."
      : "An earning can be approved as soon as the order is paid — there is no waiting " +
        "period at the moment.";
  return [
    {
      title: "Links and pricing",
      faqs: [
        {
          id: "markup",
          q: "How does my markup work?",
          a: `You choose a markup of up to ${rules.maxMarkupPercent}%. Anyone who arrives through your link sees every product in the store priced that much higher, and the difference is what you earn. The markup travels with the link, so it applies to whatever they end up buying — not only the item you shared.`,
        },
        {
          id: "link-types",
          q: "What's the difference between a shop link and a product link?",
          a: "Only where the customer arrives. A shop link opens the storefront; a product link opens that one product, which is handy when you're recommending something specific. Your markup works the same either way — it covers everything in their basket, so if they follow a product link and buy something else, you still earn on it.",
        },
        {
          id: "link-limit",
          q: "How many links can I have?",
          a: `Up to ${rules.maxLinks} at a time. If you have used them all, delete one on your Links & Codes page and the slot frees up straight away.`,
        },
        {
          id: "link-delete",
          q: "What happens to my earnings if I delete a link?",
          a: "You keep them. Anything already earned stays on your Earnings page and still gets paid. Deleting only stops the link itself working: it no longer applies your markup, so anyone opening it afterwards sees the ordinary store at the ordinary price. A link that has earned is kept on record as inactive rather than removed, so your history stays readable.",
        },
        {
          id: "missing-product",
          q: "Why can't I find a product to link to?",
          a: "You can only link to products published on the CyberVilla website, so anything not currently on sale there will not appear in the list. If a product is taken off the website after you have made a link, that link stops working — you will get a notification when that happens, so you can delete it and share something else instead.",
        },
      ],
    },
    {
      title: "Earnings",
      faqs: [
        {
          id: "recorded",
          q: "When is a sale recorded for me?",
          a: "As soon as the store confirms the customer has paid, the order is reported here and appears on your Earnings and Transactions pages. Nothing is counted before the money has actually landed.",
        },
        {
          id: "statuses",
          q: "What do the earning statuses mean?",
          a: "Pending means the store has reported a paid order and it is waiting out the review window. Approved means it has cleared that window and been checked, so it is ready to be paid. Paid means it was included in a payout that has been sent to you. Reversed means the order was later cancelled or refunded, so that money is not yours and is left out of your totals.",
        },
        {
          id: "which-link",
          q: "How do I know which link drove a sale?",
          a: "Your Links & Codes page shows the number of paid orders and the amount earned for each individual link, so you can see which of your links is actually working.",
        },
        {
          id: "self-purchase",
          q: "Can I use my own link for my own purchases?",
          a: "No. Buying through your own link is not eligible and may have its earnings reversed.",
        },
      ],
    },
    {
      title: "Getting paid",
      faqs: [
        {
          id: "when-paid",
          q: "When do I get paid?",
          a: `There are two steps. ${waiting} Then, once your approved earnings add up to at least ${minimum}, you can request a payout from your Earnings page. We send it to your bank account by transfer and record it here once it has gone out. Payouts are not automatic and not on a fixed date — you ask, and we send.`,
        },
        {
          id: "payout-blocked",
          q: "Why can't I request a payout yet?",
          a: `Your Earnings page gives you the exact reason. It is normally one of four: no approved earnings yet, an approved balance still under the ${minimum} minimum, no bank account saved, or a payout already in progress. Anything under the minimum is not lost — it rolls over to your next payout.`,
        },
        {
          id: "bank-details",
          q: "How do I add or change my bank account?",
          a: "On your Earnings page, under payout details. We only ever keep the last four digits where they can be read back, so changing the account means typing the full number again rather than editing it.",
        },
        {
          id: "payout-failed",
          q: "What if a payout fails?",
          a: "It is marked as failed with the reason, which is usually bank details that do not match. The earnings in it go straight back to approved, so they are included the next time you request one. The failed attempt stays in your payout history so there is a record of what happened.",
        },
      ],
    },
    {
      title: "Notifications",
      faqs: [
        {
          id: "notifications",
          q: "How will I know when something happens?",
          a: "The bell at the top of the page. You will get a notice when your account is approved, when a sale earns you money, when an earning is approved, when a payout is sent or fails, and if one of your links stops working. There are no email alerts yet, so the bell is the place to check.",
        },
      ],
    },
  ];
}

export default function SupportPage() {
  const [rules, setRules] = useState<AffiliateRules>(FALLBACK_RULES);
  const [openFaq, setOpenFaq] = useState<string | null>("markup");

  useEffect(() => {
    let cancelled = false;
    fetchAffiliateRules()
      .then((live) => {
        if (!cancelled) setRules(live);
      })
      // The fallback numbers are the shipped defaults, so a failed fetch
      // leaves the page correct rather than empty or alarming.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = faqSections(rules);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">How the affiliate program works, and where to get help.</p>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader title={section.title} />
          <div className="divide-y divide-border">
            {section.faqs.map((faq) => (
              <div key={faq.id}>
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  aria-expanded={openFaq === faq.id}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-medium text-foreground sm:p-5"
                >
                  {faq.q}
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-muted transition-transform",
                      openFaq === faq.id && "rotate-180",
                    )}
                  />
                </button>
                {openFaq === faq.id && (
                  <p className="px-4 pb-4 text-sm text-muted sm:px-5">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

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
              page. If it is about a payout, quote the payout reference from your{" "}
              <Link href="/earnings" className="text-accent hover:underline">
                earnings
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
