/**
 * Talking to cybervilla-affiliates-api.
 *
 * The backend is the source of truth for catalogue, authentication, and admin
 * data. UI pages should not fall back to mock records when a request fails.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export interface ApiProduct {
  /** The store's own product id — what links and orders will point at. */
  id: number;
  name: string;
  description: string;
  price: number;
  /** What the store prices this in. Never assumed; may be absent. */
  currency: string | null;
  category: string | null;
  categoryId: number | null;
  available: boolean;
  /** Relative to the API, not to this app — pass it through productImageUrl(). */
  imageUrl: string;
}

export interface CatalogueState {
  syncedAt: string | null;
  productCount: number;
  /** The copy is older than the backend's freshness window. */
  stale: boolean;
  everSynced: boolean;
  storeConfigured: boolean;
  lastError?: string;
}

export interface ProductsPage {
  products: ApiProduct[];
  page: number;
  perPage: number;
  total: number;
  catalogue: CatalogueState;
}

export interface ApiCategory {
  id: number;
  name: string;
  productCount: number;
}

/** A failure we can show someone, rather than a stack trace. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const OFFLINE_MESSAGE =
  "We could not reach the affiliate service. Check your connection and try again.";

async function requestJson<T>(
  method: string,
  path: string,
  data?: unknown,
  signal?: AbortSignal,
  customHeaders?: Record<string, string>,
): Promise<T> {
  let response: Response;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...customHeaders,
  };
  if (data !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(OFFLINE_MESSAGE, 0, "unreachable");
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Left null
  }

  if (!response.ok) {
    const problem = (body ?? {}) as { message?: string; error?: string };
    throw new ApiError(
      problem.message ?? "Something went wrong at our end.",
      response.status,
      problem.error ?? "error",
    );
  }
  return body as T;
}

async function getJson<T>(path: string, signal?: AbortSignal, customHeaders?: Record<string, string>): Promise<T> {
  return requestJson<T>("GET", path, undefined, signal, customHeaders);
}

async function postJson<T>(path: string, data?: unknown, signal?: AbortSignal, customHeaders?: Record<string, string>): Promise<T> {
  return requestJson<T>("POST", path, data, signal, customHeaders);
}

export function productImageUrl(product: ApiProduct): string {
  return `${API_BASE}${product.imageUrl}`;
}

export function fetchProducts(
  params: { search?: string; categoryId?: number | null; page?: number; perPage?: number },
  signal?: AbortSignal,
): Promise<ProductsPage> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.categoryId) query.set("category", String(params.categoryId));
  if (params.page) query.set("page", String(params.page));
  if (params.perPage) query.set("perPage", String(params.perPage));

  const suffix = query.toString();
  return getJson<ProductsPage>(`/products${suffix ? `?${suffix}` : ""}`, signal);
}

export function fetchCategories(signal?: AbortSignal): Promise<{ categories: ApiCategory[] }> {
  return getJson<{ categories: ApiCategory[] }>("/categories", signal);
}

/** One product by the store's own id — used when a link names a product. */
export function fetchProduct(
  odooId: number,
  signal?: AbortSignal,
): Promise<{ product: ApiProduct; catalogue: CatalogueState }> {
  return getJson<{ product: ApiProduct; catalogue: CatalogueState }>(`/products/${odooId}`, signal);
}

// ---------------------------------------------------------------------------
// Authentication & Affiliate Program Approvals
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "affiliate";
  status: "pending" | "approved" | "rejected" | "suspended" | "active";
  isMember: boolean;
  rejectionReason?: string | null;
  whyJoin?: string | null;
  affiliateId?: string | null;
  createdAt: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user: AuthUser;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("affiliate_token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("affiliate_token", token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("affiliate_token");
}

export async function signoutUser(): Promise<void> {
  try {
    await postJson<{ success: boolean }>("/auth/logout");
  } finally {
    clearStoredToken();
  }
}

export function signupAffiliate(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  whyJoin: string;
}): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/signup", data);
}

export function signinUser(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/signin", data);
}

export function getCurrentUser(): Promise<{ user: AuthUser; affiliate?: unknown }> {
  const token = getStoredToken();
  return getJson<{ user: AuthUser; affiliate?: unknown }>(
    "/auth/me",
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export interface AffiliateEarning {
  orderRef: string;
  affiliateCode: string | null;
  currency: string | null;
  markupPercent: number;
  amountTotal: number;
  earning: number;
  status: string;
  occurredAt: string | null;
  /** The payout this was settled in, once one has settled it. */
  payoutRef?: string | null;
  /** Campaign commission on this order, paid on top of the markup. */
  commission?: number;
  /** Markup plus commission — what the affiliate is actually owed. */
  totalDue?: number;
  /** The goods on the order. Empty means the store did not report them. */
  lines?: {
    productId: number | null;
    productTmplId: number | null;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    commission: number;
    campaign: string | null;
  }[];
  /** Which link brought the sale in — the link, not the goods bought. */
  sourceCode?: string | null;
  sourceLabel?: string | null;
  sourceKind?: "product" | "storewide" | null;
}

export function fetchAffiliateEarnings(): Promise<{ earnings: AffiliateEarning[] }> {
  const token = getStoredToken();
  return getJson<{ earnings: AffiliateEarning[] }>(
    "/affiliate/earnings",
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export interface AdminAffiliateItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  isMember: boolean;
  rejectionReason?: string | null;
  whyJoin?: string | null;
  affiliateRef?: string | null;
  odooAffiliateId?: number | null;
  synced: boolean;
  joinedAt: string | null;
}

export interface AdminEarning {
  orderRef: string;
  affiliateCode: string | null;
  currency: string | null;
  markupPercent: number;
  amountTotal: number;
  earning: number;
  status: string;
  occurredAt: string | null;
}

export interface AdminAffiliateDetail {
  affiliate: AdminAffiliateItem;
  links: Array<{
    id: string;
    code: string;
    label: string;
    url: string;
    targetType: string;
    productId: number | null;
    markupPercent: number;
    active: boolean;
    synced: boolean;
    createdAt: string | null;
  }>;
  earnings: AdminEarning[];
}

export function fetchAdminAffiliates(
  params: { status?: string; search?: string; page?: number; perPage?: number } = {},
): Promise<{
  affiliates: AdminAffiliateItem[];
  total: number;
  stats: { pending: number; approved: number };
}> {
  const token = getStoredToken();
  const query = new URLSearchParams();
  query.set("status", params.status?.trim() || "all");
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.page) query.set("page", String(params.page));
  if (params.perPage) query.set("perPage", String(params.perPage));

  return getJson<{
    affiliates: AdminAffiliateItem[];
    total: number;
    stats: { pending: number; approved: number };
  }>(
    `/admin/affiliates?${query.toString()}`,
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export function approveAffiliateApi(id: number): Promise<{ success: boolean; message: string }> {
  const token = getStoredToken();
  return postJson<{ success: boolean; message: string }>(
    `/admin/affiliates/${id}/approve`,
    {},
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export function rejectAffiliateApi(id: number, reason: string): Promise<{ success: boolean; message: string }> {
  const token = getStoredToken();
  return postJson<{ success: boolean; message: string }>(
    `/admin/affiliates/${id}/reject`,
    { reason },
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export function fetchAdminAffiliate(id: number): Promise<AdminAffiliateDetail> {
  const token = getStoredToken();
  return getJson<AdminAffiliateDetail>(
    `/admin/affiliates/${id}`,
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface AppNotice {
  id: number;
  /** Stable event name, e.g. "payout.paid" — drives the icon, not the wording. */
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string | null;
}

export function fetchNotifications(limit = 50): Promise<{
  notifications: AppNotice[];
  unread: number;
}> {
  const token = getStoredToken();
  return getJson<{ notifications: AppNotice[]; unread: number }>(
    `/notifications?limit=${limit}`,
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

/** Omit `ids` to mark everything read. */
export function markNotificationsRead(ids?: number[]): Promise<{ read: number; unread: number }> {
  const token = getStoredToken();
  return postJson<{ read: number; unread: number }>(
    "/notifications/read",
    { ids },
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export interface PayoutAccount {
  /** As the bank reports it — not as the affiliate typed it. */
  accountName: string;
  bankName: string;
  bankCode: string;
  /** Never returned in full once saved. */
  accountNumberLast4: string;
  complete: boolean;
}

export interface Bank {
  code: string;
  name: string;
}

export function fetchBanks(): Promise<{ banks: Bank[] }> {
  return getJson<{ banks: Bank[] }>("/banks", undefined, authHeader());
}

/** Ask the bank who owns this account. Saves nothing. */
export function resolveAccountName(
  data: { accountNumber: string; bankCode: string },
  signal?: AbortSignal,
): Promise<{ accountName: string }> {
  return requestJson<{ accountName: string }>(
    "POST", "/affiliate/payout-account/resolve", data, signal, authHeader(),
  );
}

export interface PayoutBalance {
  amount: number;
  orderCount: number;
  currency: string | null;
  minimum: number;
  /** Earned but still inside the waiting period after a sale. */
  waiting: number;
  holdDays: number;
  canRequest: boolean;
  /** Plain reasons a payout can't be requested yet, for showing as-is. */
  blockedBy: string[];
}

export interface PayoutRecord {
  id: string;
  amount: number;
  currency: string | null;
  method: string;
  status: string;
  orderCount: number;
  accountName: string;
  bankName: string;
  accountNumberLast4: string;
  failureReason: string | null;
  /** Paystack is holding this transfer until the code it sent is supplied. */
  awaitingOtp: boolean;
  /** Paystack's own word for where the transfer is, when one was used. */
  providerStatus: string | null;
  note: string | null;
  requestedAt: string | null;
  paidAt: string | null;
  affiliateName?: string;
  affiliateRef?: string;
}

function authHeader() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function fetchPayoutAccount(): Promise<{ account: PayoutAccount }> {
  return getJson<{ account: PayoutAccount }>("/affiliate/payout-account", undefined, authHeader());
}

/**
 * The account name is not sent: the server asks the bank and stores that
 * answer, so what the browser believes about the name cannot decide it.
 */
export function savePayoutAccount(data: {
  accountNumber: string;
  bankCode: string;
}): Promise<{ account: PayoutAccount }> {
  return requestJson<{ account: PayoutAccount }>(
    "PUT", "/affiliate/payout-account", data, undefined, authHeader(),
  );
}

export function fetchPayouts(): Promise<{ payouts: PayoutRecord[]; balance: PayoutBalance | null }> {
  return getJson<{ payouts: PayoutRecord[]; balance: PayoutBalance | null }>(
    "/affiliate/payouts", undefined, authHeader(),
  );
}

export function requestPayout(note = ""): Promise<{ payout: PayoutRecord }> {
  return postJson<{ payout: PayoutRecord }>("/affiliate/payouts", { note }, undefined, authHeader());
}

export function fetchApprovableEarnings(): Promise<{ earnings: AdminEarning[]; holdDays: number }> {
  return getJson<{ earnings: AdminEarning[]; holdDays: number }>(
    "/admin/earnings/approvable", undefined, authHeader(),
  );
}

export function approveEarnings(orderRefs?: string[]): Promise<{ approved: number }> {
  return postJson<{ approved: number }>(
    "/admin/earnings/approve", { orderRefs }, undefined, authHeader(),
  );
}

export function fetchAdminPayouts(status = "all"): Promise<{ payouts: PayoutRecord[] }> {
  return getJson<{ payouts: PayoutRecord[] }>(
    `/admin/payouts?status=${encodeURIComponent(status)}`, undefined, authHeader(),
  );
}

export function markPayoutPaid(reference: string, data: { reference?: string; note?: string }) {
  return postJson<{ payout: PayoutRecord }>(
    `/admin/payouts/${encodeURIComponent(reference)}/paid`, data, undefined, authHeader(),
  );
}

/**
 * Actually send the money. Unlike markPayoutPaid, this one moves it.
 *
 * It may come back with `awaitingOtp`, meaning Paystack has sent a code to
 * the account owner and is holding the transfer until it is supplied.
 */
export function sendPayout(reference: string) {
  return postJson<{ payout: PayoutRecord }>(
    `/admin/payouts/${encodeURIComponent(reference)}/send`, {}, undefined, authHeader(),
  );
}

export function confirmPayoutOtp(reference: string, otp: string) {
  return postJson<{ payout: PayoutRecord }>(
    `/admin/payouts/${encodeURIComponent(reference)}/confirm-otp`, { otp }, undefined, authHeader(),
  );
}

export function resendPayoutOtp(reference: string) {
  return postJson<{ sent: boolean }>(
    `/admin/payouts/${encodeURIComponent(reference)}/resend-otp`, {}, undefined, authHeader(),
  );
}

/** Make our record agree with Paystack's. Never sends anything. */
export function reconcilePayout(reference: string) {
  return postJson<{ payout: PayoutRecord }>(
    `/admin/payouts/${encodeURIComponent(reference)}/reconcile`, {}, undefined, authHeader(),
  );
}

export function markPayoutFailed(reference: string, reason: string) {
  return postJson<{ payout: PayoutRecord }>(
    `/admin/payouts/${encodeURIComponent(reference)}/failed`, { reason }, undefined, authHeader(),
  );
}

export interface AdminEarningsPage {
  earnings: AdminEarning[];
  /** How many rows came back (the list is capped for the browser's sake). */
  returned: number;
  /** How many exist in total — the list may be a subset of this. */
  total: number;
  truncated: boolean;
  /** Summed in the database over every row, so never capped by the list. */
  totalsByStatus: Record<string, { count: number; earning: number }>;
}

export function fetchAdminEarnings(): Promise<AdminEarningsPage> {
  const token = getStoredToken();
  return getJson<AdminEarningsPage>(
    "/admin/earnings",
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Affiliate Link Management
// ---------------------------------------------------------------------------

export interface AffiliateLinkData {
  id: string;
  code: string;
  label: string;
  url: string;
  targetType: string;
  productId: number | null;
  /** Name of the product it lands on, looked up fresh; null for storewide. */
  productName: string | null;
  markupPercent: number;
  active: boolean;
  synced: boolean;
  createdAt: string | null;
  /** Paid orders through this link, and what they earned. Cancellations excluded. */
  sales: number;
  earnings: number;
  /** What the store priced those orders in; null until there are any. */
  currency: string | null;
}

export interface AffiliateLinksPage {
  links: AffiliateLinkData[];
  /** How many live links this affiliate holds, and the most they may have. */
  used: number;
  maxLinks: number;
}

export function fetchAffiliateLinks(): Promise<AffiliateLinksPage> {
  const token = getStoredToken();
  return getJson<AffiliateLinksPage>(
    "/affiliate/links",
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

/** Retire a link. The store is switched off first, so a retired code cannot
 *  keep pricing a basket with nothing left to credit the sale to. */
export function deleteAffiliateLink(backendRef: string): Promise<{ outcome: string }> {
  const token = getStoredToken();
  return requestJson<{ outcome: string }>(
    "DELETE",
    `/affiliate/links/${encodeURIComponent(backendRef)}`,
    undefined,
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export function createAffiliateLink(data: {
  markupPercent: number;
  label: string;
  /** Where the link lands. Omit for a storewide link. */
  productId?: number;
}): Promise<{ link: AffiliateLinkData }> {
  const token = getStoredToken();
  return postJson<{ link: AffiliateLinkData }>(
    "/affiliate/links",
    data,
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}


/**
 * The limits the programme actually enforces, as the server holds them.
 *
 * Fetched rather than hardcoded so that help text and forms quote the cap
 * that is really applied — a dashboard stating 10% while the server clamps
 * to 8% would reject prices it had just told the affiliate to use.
 */
export interface AffiliateRules {
  maxMarkupPercent: number;
  maxLinks: number;
  minPayout: number;
  holdDays: number;
}

export function fetchAffiliateRules(): Promise<AffiliateRules> {
  return getJson<AffiliateRules>("/affiliate/rules", undefined, authHeader());
}

/**
 * A campaign pays an affiliate extra for selling particular products, on
 * top of the markup they already keep.
 */
export interface CampaignProductRef {
  productId: number | null;
  productTmplId: number | null;
  name: string;
}

export interface Campaign {
  id: number;
  name: string;
  description: string;
  /** "percent" of the line's value, or "fixed" naira per unit sold. */
  rewardType: "percent" | "fixed";
  rewardValue: number;
  startsAt: string | null;
  endsAt: string | null;
  /** Switched on by an admin. */
  active: boolean;
  /** Switched on AND inside its dates — i.e. paying out right now. */
  live: boolean;
  productCount: number;
  products: CampaignProductRef[];
}

export interface CampaignInput {
  name: string;
  description?: string;
  rewardType: "percent" | "fixed";
  rewardValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
  products: CampaignProductRef[];
}

export function fetchAdminCampaigns(): Promise<{ campaigns: Campaign[] }> {
  return getJson<{ campaigns: Campaign[] }>("/admin/campaigns", undefined, authHeader());
}

export function createCampaign(data: CampaignInput): Promise<{ campaign: Campaign }> {
  return postJson<{ campaign: Campaign }>("/admin/campaigns", data, undefined, authHeader());
}

export function updateCampaign(id: number, data: CampaignInput): Promise<{ campaign: Campaign }> {
  return requestJson<{ campaign: Campaign }>(
    "PUT", `/admin/campaigns/${id}`, data, undefined, authHeader(),
  );
}

/** Switches a campaign off. Never deletes it — earnings point at it. */
export function stopCampaign(id: number): Promise<{ campaign: Campaign }> {
  return requestJson<{ campaign: Campaign }>(
    "DELETE", `/admin/campaigns/${id}`, undefined, undefined, authHeader(),
  );
}

/** What an affiliate can earn extra on right now. */
export function fetchLiveCampaigns(): Promise<{ campaigns: Campaign[] }> {
  return getJson<{ campaigns: Campaign[] }>("/affiliate/campaigns", undefined, authHeader());
}

/** What a campaign pays on one unit of a product, at that product's price. */
export interface ProductReward {
  /** Naira on one unit — already worked out, so the card never guesses. */
  amount: number;
  rewardType: "percent" | "fixed";
  rewardValue: number;
  campaign: string;
  currency: string | null;
}

/** Keyed by product id as a string, since it arrives as a JSON object. */
export function fetchProductRewards(): Promise<{ rewards: Record<string, ProductReward> }> {
  return getJson<{ rewards: Record<string, ProductReward> }>(
    "/affiliate/product-rewards", undefined, authHeader(),
  );
}
