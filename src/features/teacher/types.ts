export type LessonContentType = "pdf" | "video" | "pdf_upload" | "video_upload";

export type TeacherLesson = {
  id: string;
  title: string;
  contentType: LessonContentType;
  /** PDF URL, video URL, or uploaded file URL */
  contentUrl: string;
  duration?: string;
  order: number;
};

export type TeacherCourse = {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  /** Shown on teacher class cards and catalog when supported by API. */
  thumbnailUrl?: string;
  /** How many class sessions meet within a 6‑month period. */
  classMeetingsInSixMonths?: number;
  /** @deprecated Local-only legacy field; pricing is admin-set for API courses. */
  price?: number;
  lessons: TeacherLesson[];
  createdAt: string;
  updatedAt: string;
  status?: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  /** From API / roster — enrolled students for this class. */
  enrollmentCount?: number;
};
