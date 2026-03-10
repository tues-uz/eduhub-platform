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
  /** Price in currency units (e.g. 49.99 for $49.99). Optional; undefined or 0 = free. */
  price?: number;
  lessons: TeacherLesson[];
  createdAt: string;
  updatedAt: string;
};
