import { useQuery } from "@tanstack/react-query";
import { eduhubAuth } from "@/api/eduhubClient";
import { useAuthSession } from "@/features/auth/context";

/** Platform default instructor share of tuition revenue when no per-instructor override is set. */
export const DEFAULT_INSTRUCTOR_REVENUE_SHARE = 0.6;

export const CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS = [0.6, 0.7] as const;
export type ContractInstructorRevenueShare = (typeof CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS)[number];

export function resolveInstructorShare(share: number | null | undefined): number {
  return share ?? DEFAULT_INSTRUCTOR_REVENUE_SHARE;
}

export function formatContractShareLabel(instructorShare: number): string {
  const instructorPct = Math.round(instructorShare * 100);
  return `${instructorPct}/${100 - instructorPct}`;
}

/** The signed-in instructor's own revenue-share split, from their account (admin-set override or platform default). */
export function useMyInstructorRevenueShare(): number {
  const { user } = useAuthSession();
  const { data } = useQuery({
    queryKey: ["me", "revenue-share", user.email],
    queryFn: eduhubAuth.me,
    enabled: Boolean(user.email) && user.role === "teacher",
    staleTime: 5 * 60 * 1000,
  });
  return resolveInstructorShare(data?.instructorRevenueShare);
}
