export type TransactionStatus = "pending" | "completed" | "cancelled" | "refunded";

export type PromotionStatus = "active" | "expired" | "unavailable" | "inactive";

export interface KpiPoint {
  date: string;
  sales: number;
  commissions: number;
}

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  commissionRate: number;
  offer?: string;
  status: PromotionStatus;
  eligible: boolean;
}

export interface AffiliateLink {
  id: string;
  label: string;
  /** Every link is storewide — there is no per-product link type. */
  targetType: "Storewide";
  target: string;
  url: string;
  /** Typeable substitute for the URL — same tracking and commission as the link. */
  code: string;
  utm?: string;
  sales: number;
  earnings?: number;
  commissions: number;
  createdAt: string;
  status: PromotionStatus;
  markupPercent?: number;
  /** Currency of this link's earnings, as the store reported them. */
  currency?: string | null;
}

export interface Transaction {
  id: string;
  orderId: string;
  date: string;
  product: string;
  quantity: number;
  amount: number;
  source: string;
  sourceType: "Link" | "Code";
  commission: number;
  transactionStatus: TransactionStatus;
  /** Only meaningful once transactionStatus is "completed" — a pending/cancelled/refunded order never gets paid out. */
  payoutStatus: "unpaid" | "paid";
}

export interface AppNotification {
  id: string;
  type: "earning" | "commission" | "transaction" | "payout" | "promotion";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  href?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  relatedTo?: string;
}

export type AffiliateAccountStatus = "active" | "approved" | "suspended" | "pending" | "rejected";

export interface AffiliateApplication {
  channel: "Instagram" | "TikTok" | "YouTube" | "Blog / Website" | "WhatsApp Community" | "Twitter/X";
  channelUrl: string;
  audienceSize: number;
  pitch: string;
  appliedAt: string;
}

export interface AdminAffiliate {
  id: string;
  name: string;
  email: string;
  tier: string;
  status: AffiliateAccountStatus;
  joinedAt: string;
  sales: number;
  commissions: number;
  payableBalance: number;
  linkCount: number;
  application: AffiliateApplication;
  taxFormOnFile: boolean;
  paymentVerified: boolean;
  rejectionReason?: string;
}

export interface PlatformTransaction extends Transaction {
  affiliateId: string;
  affiliateName: string;
}

export interface PlatformPayout {
  id: string;
  affiliateId: string;
  affiliateName: string;
  requestedAt: string;
  amount: number;
  method: "Bank Transfer" | "PayPal";
  status: "pending" | "processing" | "completed" | "failed";
  reference: string;
  /** Needs manual review before it can be auto-processed — large amount, missing compliance docs, or first payout. */
  flagged: boolean;
  flagReason?: string;
  rejectionReason?: string;
}
