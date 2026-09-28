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
  promotionalChannel?: string | null;
  channelUrl?: string | null;
  audienceSize?: string | null;
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
  promotionalChannel: string;
  channelUrl: string;
  audienceSize: string;
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
  promotionalChannel?: string | null;
  channelUrl?: string | null;
  audienceSize?: string | null;
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

export function fetchAffiliateLinks(): Promise<{ links: AffiliateLinkData[] }> {
  const token = getStoredToken();
  return getJson<{ links: AffiliateLinkData[] }>(
    "/affiliate/links",
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

export function createAffiliateLink(data: {
  markupPercent: number;
  label: string;
}): Promise<{ link: AffiliateLinkData }> {
  const token = getStoredToken();
  return postJson<{ link: AffiliateLinkData }>(
    "/affiliate/links",
    data,
    undefined,
    token ? { Authorization: `Bearer ${token}` } : undefined,
  );
}

