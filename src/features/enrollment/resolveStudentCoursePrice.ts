import { isInternalStudent } from "@/features/auth/studentAffiliation";

export type ResolvedStudentCoursePrice = {
  baseAmount: number;
  isInternal: boolean;
};

/** Resolve listed tuition for the viewer. Internal/external students pay the same catalog price. */
export function resolveStudentCoursePrice(opts: {
  amount: number | undefined | null;
  latestSchool?: string | null;
}): ResolvedStudentCoursePrice | null {
  const amount = opts.amount;
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;

  const school = opts.latestSchool?.trim() ?? "";
  return {
    baseAmount: Math.round(amount),
    isInternal: school ? isInternalStudent(school) : false,
  };
}
