import type { AdminPaymentRow, PaymentStatus } from "@/features/admin/data/adminOperationalMock";

export const INSTRUCTOR_REVENUE_SHARE = 0.7;
export const PLATFORM_REVENUE_SHARE = 1 - INSTRUCTOR_REVENUE_SHARE;

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function addToCurrencyMap(map: Map<string, number>, currency: string, amount: number) {
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

export function currencyMapToFormattedLines(map: Map<string, number>): { currency: string; amount: number; formatted: string }[] {
  return Array.from(map.entries()).map(([currency, amount]) => ({
    currency,
    amount,
    formatted: formatMoney(amount, currency),
  }));
}

export function sumAmountsForStatuses(rows: AdminPaymentRow[], statuses: PaymentStatus[]) {
  const set = new Set(statuses);
  const map = new Map<string, number>();
  for (const p of rows) {
    if (!set.has(p.status)) continue;
    addToCurrencyMap(map, p.currency, p.amount);
  }
  return currencyMapToFormattedLines(map);
}

export type ClassPayrollAggregate = {
  className: string;
  course: string;
  lecturerName: string;
  lecturerEmail?: string;
  paymentCount: number;
  paidCount: number;
  unpaidCount: number;
  paidByCurrency: Map<string, number>;
  outstandingByCurrency: Map<string, number>;
};

export function mergeCurrencyMaps(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const m = new Map(a);
  for (const [currency, amount] of b.entries()) {
    m.set(currency, (m.get(currency) ?? 0) + amount);
  }
  return m;
}

export function estimateInstructorAndPlatformSplitLines(totalByCurrency: Map<string, number>): {
  instructorLines: ReturnType<typeof currencyMapToFormattedLines>;
  platformLines: ReturnType<typeof currencyMapToFormattedLines>;
} {
  const instructor = new Map<string, number>();
  const platform = new Map<string, number>();
  for (const [currency, amount] of totalByCurrency.entries()) {
    instructor.set(currency, Math.round(amount * INSTRUCTOR_REVENUE_SHARE));
    platform.set(currency, Math.round(amount * PLATFORM_REVENUE_SHARE));
  }
  return {
    instructorLines: currencyMapToFormattedLines(instructor),
    platformLines: currencyMapToFormattedLines(platform),
  };
}

export function estimateInstructorPayoutLines(paidByCurrency: Map<string, number>) {
  return currencyMapToFormattedLines(
    new Map(
      Array.from(paidByCurrency.entries()).map(([currency, amount]) => [
        currency,
        Math.round(amount * INSTRUCTOR_REVENUE_SHARE),
      ]),
    ),
  );
}

/** Group payment rows by class section + course (same keys as admin payroll cards). */
export function aggregatePaymentsByClass(rows: AdminPaymentRow[]): ClassPayrollAggregate[] {
  const map = new Map<string, ClassPayrollAggregate>();
  for (const p of rows) {
    const key = `${p.className}\t${p.course}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        className: p.className,
        course: p.course,
        lecturerName: p.lecturerName,
        lecturerEmail: p.lecturerEmail?.trim() || undefined,
        paymentCount: 0,
        paidCount: 0,
        unpaidCount: 0,
        paidByCurrency: new Map(),
        outstandingByCurrency: new Map(),
      };
      map.set(key, agg);
    }
    if (!agg.lecturerEmail && p.lecturerEmail?.trim()) {
      agg.lecturerEmail = p.lecturerEmail.trim();
    }
    agg.paymentCount += 1;
    if (p.status === "paid") {
      agg.paidCount += 1;
      addToCurrencyMap(agg.paidByCurrency, p.currency, p.amount);
    } else {
      agg.unpaidCount += 1;
      addToCurrencyMap(agg.outstandingByCurrency, p.currency, p.amount);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.className.localeCompare(b.className) === 0 ? a.course.localeCompare(b.course) : a.className.localeCompare(b.className),
  );
}

/** One-line summary for requests and notifications. */
export function buildPayrollSummaryText(agg: ClassPayrollAggregate): string {
  const paidLines = currencyMapToFormattedLines(agg.paidByCurrency);
  const outLines = currencyMapToFormattedLines(agg.outstandingByCurrency);
  const estLines = estimateInstructorPayoutLines(agg.paidByCurrency);
  const col = paidLines.length ? paidLines.map((l) => l.formatted).join(", ") : "—";
  const out = outLines.length ? outLines.map((l) => l.formatted).join(", ") : "—";
  const est = estLines.length ? estLines.map((l) => l.formatted).join(", ") : "—";
  return `Collected: ${col}. Outstanding: ${out}. Est. payout (${Math.round(INSTRUCTOR_REVENUE_SHARE * 100)}% of collected): ${est}.`;
}
