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
  /** Optional longer "about this class" text for students. */
  aboutClass?: string;
  /** Course category (e.g. Language, Economics). */
  category?: string;
  instructorName: string;
  /** Optional thumbnail image URL (uploaded or external). */
  thumbnailUrl?: string;
  /** Price in currency units (e.g. 49.99 for $49.99). Optional; undefined or 0 = free. */
  price?: number;
  lessons: TeacherLesson[];
  createdAt: string;
  updatedAt: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};
