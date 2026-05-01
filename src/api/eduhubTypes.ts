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
  mustChangePassword: boolean;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface CourseRequest {
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  status?: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  /** How many in-person/live class sessions meet within a 6‑month period (lecturer-provided). */
  classMeetingsInSixMonths?: number;
}

export interface CoursePricingResponse {
  amount: number;
  currency: string;
  referralCode?: string;
  discountPercent: number;
  discountedAmount: number;
}

export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  category: string;
  lecturer: UserResponse;
  enrollmentCount?: number;
  pricing?: CoursePricingResponse;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** When returned by API, mirrors lecturer input from course create/update. */
  classMeetingsInSixMonths?: number;
}

export interface CourseSummaryResponse {
  id: string;
  title: string;
  thumbnailUrl?: string;
  status: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  category: string;
  lecturerName: string;
  enrollmentCount?: number;
  /** When the lecturer created the course (first submitted as draft). */
  createdAt: string;
  pricing?: CoursePricingResponse;
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

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  trace_id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: ApiError[];
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: {
      total: number;
      page: number;
      perPage: number;
      totalPages: number;
    };
  };
  links?: {
    next: string | null;
    prev: string | null;
    self: string;
  };
}

export interface LessonProgressRequest {
  completed: boolean;
}

export interface LessonProgressResponse {
  lessonId: string;
  isCompleted: boolean;
  completedAt?: string;
}
