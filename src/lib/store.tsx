"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { approveAffiliateApi, fetchAdminAffiliates, rejectAffiliateApi } from "./api";
import type { AdminAffiliate, PlatformPayout } from "./types";

function toAdminAffiliate(item: Awaited<ReturnType<typeof fetchAdminAffiliates>>["affiliates"][number]): AdminAffiliate {
  return {
    id: String(item.id),
    name: item.name,
    email: item.email,
    tier: "Not configured",
    // Shown exactly as stored, so the badge matches the status filter.
    status: item.status as AdminAffiliate["status"],
    joinedAt: item.joinedAt ?? "",
    sales: 0,
    commissions: 0,
    payableBalance: 0,
    linkCount: 0,
    application: {
      channel: item.promotionalChannel as AdminAffiliate["application"]["channel"],
      channelUrl: item.channelUrl ?? "",
      audienceSize: Number(item.audienceSize) || 0,
      pitch: item.whyJoin ?? "",
      appliedAt: item.joinedAt ?? "",
    },
    taxFormOnFile: false,
    paymentVerified: false,
    rejectionReason: item.rejectionReason ?? undefined,
  };
}

export interface AffiliateQuery {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

interface AppDataContextValue {
  affiliates: AdminAffiliate[];
  /** How many match the current query in the database, not how many are on screen. */
  affiliateTotal: number;
  /** Platform-wide counts, unaffected by the current filter or page. */
  affiliateStats: { pending: number; approved: number };
  payouts: PlatformPayout[];
  loadingAffiliates: boolean;
  affiliateError: string | null;
  reloadAffiliates: (query?: AffiliateQuery) => Promise<void>;
  approveAffiliate: (id: string) => Promise<void>;
  rejectAffiliate: (id: string, reason: string) => Promise<void>;
  toggleSuspend: (id: string) => void;
  requestPayout: (affiliateId: string, affiliateName: string, amount: number, method: PlatformPayout["method"]) => void;
  approvePayout: (id: string) => void;
  rejectPayout: (id: string, reason: string) => void;
  markPayoutPaid: (id: string) => void;
  processAllEligiblePayouts: () => number;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [affiliates, setAffiliates] = useState<AdminAffiliate[]>([]);
  const [affiliateTotal, setAffiliateTotal] = useState(0);
  const [affiliateStats, setAffiliateStats] = useState({ pending: 0, approved: 0 });
  const [payouts] = useState<PlatformPayout[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [affiliateError, setAffiliateError] = useState<string | null>(null);
  // Remembered so a reload after approving keeps the admin's current filter.
  const lastQuery = useRef<AffiliateQuery>({});

  // Nothing is set before the request goes out, so this is safe to call
  // straight from an effect without triggering a cascading render.
  const reloadAffiliates = useCallback(async (query?: AffiliateQuery) => {
    if (query) lastQuery.current = query;
    try {
      const { affiliates: rows, total, stats } = await fetchAdminAffiliates(lastQuery.current);
      setAffiliates(rows.map(toAdminAffiliate));
      setAffiliateTotal(total ?? rows.length);
      if (stats) setAffiliateStats(stats);
      setAffiliateError(null);
    } catch (error) {
      setAffiliates([]);
      setAffiliateError(error instanceof Error ? error.message : "Could not load affiliate applications.");
    } finally {
      setLoadingAffiliates(false);
    }
  }, []);

  // No fetch on mount: the list page owns the filter and page number, and
  // asks for exactly what it needs. Loading here too would fire a second,
  // unfiltered request on every admin screen.

  const value = useMemo<AppDataContextValue>(
    () => ({
      affiliates,
      affiliateTotal,
      affiliateStats,
      payouts,
      loadingAffiliates,
      affiliateError,
      reloadAffiliates,
      approveAffiliate: async (id) => {
        await approveAffiliateApi(Number(id));
        await reloadAffiliates();
      },
      rejectAffiliate: async (id, reason) => {
        await rejectAffiliateApi(Number(id), reason);
        await reloadAffiliates();
      },
      toggleSuspend: () => undefined,
      requestPayout: () => undefined,
      approvePayout: () => undefined,
      rejectPayout: () => undefined,
      markPayoutPaid: () => undefined,
      processAllEligiblePayouts: () => 0,
    }),
    [affiliates, affiliateError, affiliateStats, affiliateTotal, loadingAffiliates, payouts, reloadAffiliates]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
