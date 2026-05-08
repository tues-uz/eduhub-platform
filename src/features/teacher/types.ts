export type LessonContentType = "pdf" | "video" | "pdf_upload" | "video_upload";

/** One planned in-person/live session row (title + optional date/time for scheduling). */
export type ClassMeetingSlot = {
  title?: string;
  /** `YYYY-MM-DD` for `<input type="date" />`. */
  sessionDate?: string;
  /** `HH:mm` (24h) for `<input type="time" />`. */
  sessionTime?: string;
};

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
  /** Optional; when set, shown on public class views instead of a generic icon. */
  instructorAvatarUrl?: string;
  /** Shown on teacher class cards and catalog when supported by API. */
  thumbnailUrl?: string;
  /** Gallery images for the public class page; filled when API / local store supports uploads. */
  classPhotoUrls?: string[];
  /** How many class sessions meet within a 6‑month period. */
  classMeetingsInSixMonths?: number;
  /** Per-session title, date, time (same length as `classMeetingsInSixMonths` when set). */
  classMeetingSlots?: ClassMeetingSlot[];
  /** @deprecated Prefer `classMeetingSlots`; still read for older saved courses. */
  classMeetingTitles?: string[];
  /** ISO 8601; optional, for public class preview. */
  classStartDate?: string;
  /** ISO 8601; optional, for public class preview. */
  classEndDate?: string;
  /** @deprecated Local-only legacy field; pricing is admin-set for API courses. */
  price?: number;
  /** ISO 4217 when `price` comes from API catalog pricing. */
  priceCurrency?: string;
  lessons: TeacherLesson[];
  createdAt: string;
  updatedAt: string;
  status?: "DRAFT" | "SCHEDULE_PENDING" | "SCHEDULE_APPROVED" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  /** From API / roster — enrolled students for this class. */
  enrollmentCount?: number;
};
