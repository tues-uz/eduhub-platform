import { useSyncExternalStore } from "react";

/** Default instructor share of tuition revenue (platform gets the remainder). */
export const DEFAULT_INSTRUCTOR_REVENUE_SHARE = 0.6;

/** Contract options admins can assign per instructor. */
export const CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS = [0.6, 0.7] as const;

export type ContractInstructorRevenueShare = (typeof CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS)[number];

export const INSTRUCTOR_REVENUE_SHARE_CHANGED = "eduhub-instructor-revenue-share-changed";

const overridesByEmail: Record<string, ContractInstructorRevenueShare> = {};

/** Stable reference for `useSyncExternalStore` — must not allocate on every getSnapshot call. */
let overridesSnapshot: Record<string, ContractInstructorRevenueShare> = {};

function rebuildOverridesSnapshot(): void {
  overridesSnapshot = { ...overridesByEmail };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  rebuildOverridesSnapshot();
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INSTRUCTOR_REVENUE_SHARE_CHANGED));
  }
}

export function normalizeInstructorEmail(email?: string | null): string {
  return email?.trim().toLowerCase() ?? "";
}

export function getInstructorRevenueShare(instructorEmail?: string | null): number {
  const key = normalizeInstructorEmail(instructorEmail);
  if (key && overridesByEmail[key] != null) {
    return overridesByEmail[key];
  }
  return DEFAULT_INSTRUCTOR_REVENUE_SHARE;
}

export function getPlatformRevenueShare(instructorEmail?: string | null): number {
  return 1 - getInstructorRevenueShare(instructorEmail);
}

export function isContractRevenueShareOverride(instructorEmail?: string | null): boolean {
  const key = normalizeInstructorEmail(instructorEmail);
  return Boolean(key && overridesByEmail[key] != null);
}

export function listInstructorRevenueShareOverrides(): Record<string, ContractInstructorRevenueShare> {
  return { ...overridesByEmail };
}

export function setInstructorRevenueShareOverride(
  instructorEmail: string,
  share: ContractInstructorRevenueShare | "default",
): void {
  const key = normalizeInstructorEmail(instructorEmail);
  if (!key) return;
  if (share === "default" || share === DEFAULT_INSTRUCTOR_REVENUE_SHARE) {
    delete overridesByEmail[key];
  } else {
    overridesByEmail[key] = share;
  }
  emit();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Record<string, ContractInstructorRevenueShare> {
  return overridesSnapshot;
}

export function useInstructorRevenueShareOverrides(): Record<string, ContractInstructorRevenueShare> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function formatContractShareLabel(instructorShare: number): string {
  const instructorPct = Math.round(instructorShare * 100);
  return `${instructorPct}/${100 - instructorPct}`;
}
