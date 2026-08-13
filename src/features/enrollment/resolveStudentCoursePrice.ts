import { isInternalStudent } from "@/features/auth/studentAffiliation";

/**
 * Demo-only flat surcharge for external students (no backend field).
 * Example: catalog 1_000_000 → external 1_050_000.
 */
export const EXTERNAL_STUDENT_SURCHARGE_DEMO = 50_000;

export type ResolvedStudentCoursePrice = {
  baseAmount: number;
  isInternal: boolean;
  usedExternalPrice: boolean;
  surcharge: number;
};

/** Resolve listed tuition for the viewer: internal = catalog; external = catalog + demo surcharge. */
export function resolveStudentCoursePrice(opts: {
  amount: number | undefined | null;
  latestSchool?: string | null;
}): ResolvedStudentCoursePrice | null {
  const amount = opts.amount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;

  const school = opts.latestSchool?.trim() ?? "";
  // Until profile affiliation is known, keep catalog price (avoid flashing external surcharge).
  if (!school) {
    return {
      baseAmount: Math.round(amount),
      isInternal: false,
      usedExternalPrice: false,
      surcharge: 0,
    };
  }

  const isInternal = isInternalStudent(school);
  if (isInternal) {
    return {
      baseAmount: Math.round(amount),
      isInternal: true,
      usedExternalPrice: false,
      surcharge: 0,
    };
  }

  const surcharge = EXTERNAL_STUDENT_SURCHARGE_DEMO;
  return {
    baseAmount: Math.round(amount) + surcharge,
    isInternal: false,
    usedExternalPrice: true,
    surcharge,
  };
}
