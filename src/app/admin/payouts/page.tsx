"use client";

import { Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Payout management will appear here when the backend exposes payout records and actions.</p>
      <Card>
        <CardHeader title="Payouts" subtitle="No backend payout resource is available" />
        <div className="flex items-start gap-2 p-5 text-sm text-muted">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" />
          This view intentionally contains no sample payouts. It will remain empty until payout data is recorded by the backend.
        </div>
      </Card>
    </div>
  );
}
