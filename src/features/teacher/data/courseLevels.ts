import { useState, useEffect } from "react";
import { eduhubCourseLevels } from "@/api/eduhubClient";
import type { CourseLevelResponse } from "@/api/eduhubTypes";

/** Default CEFR-style levels for fallback. */
export const COURSE_LEVELS = [
  { value: "beginner_a1", labelKey: "teacher.courseForm.details.levels.beginnerA1", fallbackLabel: "A1 Beginner" },
  { value: "elementary_a1_plus", labelKey: "teacher.courseForm.details.levels.elementaryA1Plus", fallbackLabel: "A1+ Elementary" },
  { value: "pre_intermediate_b1", labelKey: "teacher.courseForm.details.levels.preIntermediateB1", fallbackLabel: "B1 Pre-Intermediate" },
  { value: "intermediate_b1_plus", labelKey: "teacher.courseForm.details.levels.intermediateB1Plus", fallbackLabel: "B1+ Intermediate" },
  {
    value: "upper_intermediate_b2_plus",
    labelKey: "teacher.courseForm.details.levels.upperIntermediateB2Plus",
    fallbackLabel: "B2+ Upper Intermediate",
  },
  { value: "advanced_c1", labelKey: "teacher.courseForm.details.levels.advancedC1", fallbackLabel: "C1 Advanced" },
  { value: "advanced_c2", labelKey: "teacher.courseForm.details.levels.advancedC2", fallbackLabel: "C2 Mastery" },
] as const;

export type CourseLevelValue = (typeof COURSE_LEVELS)[number]["value"] | (string & {});

export const COURSE_LEVEL_REQUIRED = "Please select a class level.";

export function isCourseLevelValue(value: string): boolean {
  return COURSE_LEVELS.some((level) => level.value === value) || Boolean(value?.trim());
}

export function formatCourseLevel(value?: string | null): string {
  if (!value) return "";
  const match = COURSE_LEVELS.find((l) => l.value === value);
  if (match) {
    return match.fallbackLabel;
  }
  // Convert code to capitalized words if custom code format
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface SelectableCourseLevel {
  value: string;
  label: string;
  labelKey?: string;
  description?: string;
  /** Ordering used to compare an achieved placement level against a class's required level. */
  sortOrder?: number;
}

/** Hook to fetch active course levels dynamically with default CEFR fallback. */
export function useCourseLevels() {
  const [levels, setLevels] = useState<SelectableCourseLevel[]>(() =>
    COURSE_LEVELS.map((item) => ({
      value: item.value,
      label: item.fallbackLabel,
      labelKey: item.labelKey,
    }))
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    eduhubCourseLevels
      .getAll()
      .then((data: CourseLevelResponse[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setLevels(
            data.map((lvl) => {
              const matchedStatic = COURSE_LEVELS.find((s) => s.value === lvl.code);
              return {
                value: lvl.code,
                label: lvl.name,
                labelKey: matchedStatic?.labelKey,
                description: lvl.description,
                sortOrder: lvl.sortOrder,
              };
            })
          );
        }
      })
      .catch(() => {
        // Silently use the default fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { levels, loading };
}
