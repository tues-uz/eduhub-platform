export const COURSE_CATEGORY_OPTIONS = [
  "Language",
  "Test Preparation",
  "Finance",
  "Art & Craft",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORY_OPTIONS)[number];
