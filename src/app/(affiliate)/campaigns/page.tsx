"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { fetchLiveCampaigns, type Campaign } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * What an affiliate can earn extra on right now.
 *
 * A campaign nobody knows about changes nobody's behaviour, which is the
 * whole point of paying one.
 */
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveCampaigns()
      .then(({ campaigns }) => setCampaigns(campaigns))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Could not load campaigns."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-sm text-muted">Loading campaigns…</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Extra money for selling particular products, paid{" "}
        <strong className="font-medium text-foreground">on top of</strong> your usual markup. You
        keep both.
      </p>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>
      )}

      {campaigns.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <p className="text-sm text-foreground">No campaigns are running at the moment.</p>
            <p className="mt-1 text-xs text-muted">
              You still earn your markup on everything you sell. We&apos;ll notify you when a
              campaign starts.
            </p>
          </div>
        </Card>
      ) : (
        campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader
              title={campaign.name}
              subtitle={
                campaign.endsAt ? `Runs until ${formatDate(campaign.endsAt)}` : "No end date set"
              }
            />
            <div className="space-y-3 p-4 sm:p-5">
              <p className="flex items-center gap-2 text-lg font-semibold text-accent">
                <Tag size={16} />
                {campaign.rewardType === "percent"
                  ? `${campaign.rewardValue}% extra on each sale`
                  : `${formatCurrency(campaign.rewardValue)} extra per item sold`}
              </p>

              {campaign.description && (
                <p className="text-sm text-muted">{campaign.description}</p>
              )}

              <div>
                <p className="text-xs font-medium text-muted">
                  On these {campaign.productCount} product
                  {campaign.productCount === 1 ? "" : "s"}:
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {campaign.products.map((product) => (
                    <li
                      key={`${product.productId}-${product.name}`}
                      className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-foreground"
                    >
                      {product.name}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-muted">
                The extra is paid only on the products listed here, and only on orders placed while
                the campaign is running.{" "}
                <Link href="/links" className="text-accent hover:underline">
                  Make a link
                </Link>{" "}
                to start selling them.
              </p>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
