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
  /** @deprecated Local-only legacy field; pricing is admin-set for API courses. */
  price?: number;
  lessons: TeacherLesson[];
  createdAt: string;
  updatedAt: string;
  status?: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
};
