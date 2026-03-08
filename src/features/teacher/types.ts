export type LessonContentType = "pdf" | "video";

export type TeacherLesson = {
  id: string;
  title: string;
  contentType: LessonContentType;
  /** PDF URL or video embed/link URL */
  contentUrl: string;
  duration?: string;
  order: number;
};

export type TeacherCourse = {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  lessons: TeacherLesson[];
  createdAt: string;
  updatedAt: string;
};
