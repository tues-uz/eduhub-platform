function clampDiscount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Catalog amount after applying referral discount % (same currency, integer units). */
export function computeDiscountedPrice(catalogAmount: number, discountPercent: number): number {
  if (!Number.isFinite(catalogAmount) || catalogAmount < 0) return 0;
  const d = clampDiscount(discountPercent);
  return Math.round((catalogAmount * (100 - d)) / 100);
}
