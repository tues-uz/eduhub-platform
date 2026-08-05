const STORAGE_KEY = "eduhub_admin_course_prices";

/** Local catalog metadata until course billing + referrals exist on the API. */
export type AdminCourseCatalogMeta = {
  amount: number;
  currency: string;
  /** Optional code (e.g. affiliate / campaign) shown at enrollment; empty if unused. */
  referralCode: string;
  /** Percent off list price when this referral code is applied at checkout (0 = no reduction). */
  discountPercent: number;
  /** Optional trial access code for the class; empty if unused. */
  trialCode: string;
};

function clampDiscount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeEntry(raw: unknown): AdminCourseCatalogMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.amount !== "number" || typeof o.currency !== "string") return null;
  const ref =
    typeof o.referralCode === "string"
      ? o.referralCode.trim().slice(0, 64)
      : "";
  const trial =
    typeof o.trialCode === "string"
      ? o.trialCode.trim().slice(0, 64)
      : "";
  return {
    amount: o.amount,
    currency: o.currency,
    referralCode: ref,
    discountPercent: clampDiscount(o.discountPercent),
    trialCode: trial,
  };
}

export function readAdminCourseCatalog(): Record<string, AdminCourseCatalogMeta> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, AdminCourseCatalogMeta> = {};
    for (const [id, val] of Object.entries(parsed)) {
      const n = normalizeEntry(val);
      if (n) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/** @deprecated use readAdminCourseCatalog */
export function readAdminCoursePrices(): Record<string, { amount: number; currency: string }> {
  const full = readAdminCourseCatalog();
  const out: Record<string, { amount: number; currency: string }> = {};
  for (const [id, m] of Object.entries(full)) {
    out[id] = { amount: m.amount, currency: m.currency };
  }
  return out;
}

export function writeAdminCourseCatalog(courseId: string, meta: AdminCourseCatalogMeta) {
  const all = readAdminCourseCatalog();
  all[courseId] = {
    ...meta,
    referralCode: meta.referralCode.trim().slice(0, 64),
    discountPercent: clampDiscount(meta.discountPercent),
    trialCode: (meta.trialCode ?? "").trim().slice(0, 64),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Catalog amount after applying referral discount % (same currency, integer units). */
export function computeDiscountedPrice(catalogAmount: number, discountPercent: number): number {
  if (!Number.isFinite(catalogAmount) || catalogAmount < 0) return 0;
  const d = clampDiscount(discountPercent);
  return Math.round((catalogAmount * (100 - d)) / 100);
}
