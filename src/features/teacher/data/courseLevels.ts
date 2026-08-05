/** CEFR-style levels for teacher class creation. */
export const COURSE_LEVELS = [
  { value: "beginner_a1", labelKey: "teacher.courseForm.details.levels.beginnerA1" },
  { value: "elementary_a1_plus", labelKey: "teacher.courseForm.details.levels.elementaryA1Plus" },
  { value: "pre_intermediate_b1", labelKey: "teacher.courseForm.details.levels.preIntermediateB1" },
  { value: "intermediate_b1_plus", labelKey: "teacher.courseForm.details.levels.intermediateB1Plus" },
  {
    value: "upper_intermediate_b2_plus",
    labelKey: "teacher.courseForm.details.levels.upperIntermediateB2Plus",
  },
  { value: "advanced_c1", labelKey: "teacher.courseForm.details.levels.advancedC1" },
  { value: "advanced_c2", labelKey: "teacher.courseForm.details.levels.advancedC2" },
] as const;

export type CourseLevelValue = (typeof COURSE_LEVELS)[number]["value"];

export const COURSE_LEVEL_REQUIRED = "Please select a class level.";

export function isCourseLevelValue(value: string): value is CourseLevelValue {
  return COURSE_LEVELS.some((level) => level.value === value);
}
