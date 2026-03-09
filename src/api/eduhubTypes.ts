/** Types aligned with EduHub Platform API (Swagger). */

export type ApiRole = "ADMIN" | "LECTURER" | "STUDENT";

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: ApiRole;
  avatarUrl?: string;
  bio?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CourseRequest {
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category: string;
  lecturer: UserResponse;
  enrollmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSummaryResponse {
  id: string;
  title: string;
  thumbnailUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  category: string;
  lecturerName: string;
  enrollmentCount?: number;
  createdAt: string;
}

export interface ModuleRequest {
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface ModuleResponse {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  createdAt: string;
}

export type LessonType = "VIDEO" | "DOCUMENT" | "TEXT" | "ARTICLE" | "MIXED" | "QUIZ_LINK";

export interface LessonRequest {
  title: string;
  summary?: string;
  type: LessonType;
  durationMinutes?: number;
  orderIndex?: number;
  isPreview?: boolean;
  contentUrl?: string;
}

export interface LessonResponse {
  id: string;
  moduleId: string;
  title: string;
  summary?: string;
  type: LessonType;
  publishStatus: "DRAFT" | "PUBLISHED";
  publishedAt?: string;
  durationMinutes?: number;
  orderIndex: number;
  isPreview?: boolean;
  contentUrl?: string;
  createdAt: string;
}

export interface LessonContentResponse extends LessonResponse {
  blocks: LessonBlockResponse[];
}

export interface LessonBlockResponse {
  id: string;
  type: string;
  orderIndex: number;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentRequest {
  courseId: string;
}

export interface EnrollmentResponse {
  id: string;
  student: UserResponse;
  course: CourseSummaryResponse;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  progress: number;
  enrolledAt: string;
  completedAt?: string;
}

export interface Pageable {
  page?: number;
  size?: number;
  sort?: string[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface LessonProgressRequest {
  completed: boolean;
}

export interface LessonProgressResponse {
  lessonId: string;
  isCompleted: boolean;
  completedAt?: string;
}
