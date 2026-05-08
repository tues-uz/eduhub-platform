/** Types aligned with EduHub Platform API (Swagger). */

export type ApiRole = "ADMIN" | "LECTURER" | "STUDENT";

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: ApiRole;
  avatarUrl?: string;
  bio?: string;
  phoneNumber?: string;
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

/** Planned session row from lecturer (API may ignore unknown fields until backend supports). */
export interface ClassMeetingSlotDto {
  title?: string;
  sessionDate?: string;
  sessionTime?: string;
}

export type CourseStatus = "DRAFT" | "SCHEDULE_PENDING" | "SCHEDULE_APPROVED" | "PUBLISHED" | "REJECTED" | "ARCHIVED";

export interface CourseRequest {
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  status?: CourseStatus;
  /** How many in-person/live class sessions meet within a 6‑month period (lecturer-provided). */
  classMeetingsInSixMonths?: number;
  /** ISO 8601 date (date-only or full); optional cohort/window start. */
  classStartDate?: string;
  /** ISO 8601 date; optional cohort/window end (must be ≥ start when both set). */
  classEndDate?: string;
  /** Optional title per session slot (length should match `classMeetingsInSixMonths` when provided). */
  classMeetingTitles?: string[];
  /** Richer per-session scheduling (optional). */
  classMeetingSlots?: ClassMeetingSlotDto[];
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
  status: CourseStatus;
  category: string;
  lecturer: UserResponse;
  enrollmentCount?: number;
  pricing?: CoursePricingResponse;
  rejectionReason?: string;
  scheduleRejectionNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  /** When returned by API, mirrors lecturer input from course create/update. */
  classMeetingsInSixMonths?: number;
  /** Optional gallery; lecturer-uploaded class or environment photos. */
  classPhotoUrls?: string[];
  /** ISO 8601 date; first session / cohort start (when provided by API). */
  classStartDate?: string;
  /** ISO 8601 date; last session / cohort end (when provided by API). */
  classEndDate?: string;
  /** When returned by API: optional label per planned session. */
  classMeetingTitles?: string[];
  classMeetingSlots?: ClassMeetingSlotDto[];
}

export interface CourseSummaryResponse {
  id: string;
  title: string;
  thumbnailUrl?: string;
  status: CourseStatus;
  category: string;
  lecturerName: string;
  enrollmentCount?: number;
  /** Present when the API includes it on list endpoints; otherwise filled via GET /courses/{id}. */
  classMeetingsInSixMonths?: number;
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

// Schedule Workflow Types

export interface ScheduleSessionDto {
  title: string;
  sessionDate?: string;
  sessionTime?: string;
  durationMinutes?: number;
}

export interface ScheduleProposalRequest {
  sessionCount: number;
  sessions: ScheduleSessionDto[];
}

export interface ScheduleSessionResponse {
  id: string;
  sessionIndex: number;
  title: string;
  sessionDate?: string;
  sessionTime?: string;
  durationMinutes?: number;
}

export interface ScheduleProposalResponse {
  id: string;
  courseId: string;
  proposedByName: string;
  sessionCount: number;
  sessions: ScheduleSessionResponse[];
  createdAt: string;
}

export interface ScheduleRejectRequest {
  rejectionNote?: string;
}

// Enrollment Application Types

export type EnrollmentApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EnrollmentPaymentPlan = "FULL" | "DOWN_PAYMENT";

export type EnrollmentInstallmentCount = 2 | 4 | 6 | 8;

export interface EnrollmentApplicationRequest {
  courseId: string;
  fullName: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  address: string;
  paymentProofUrl: string;
  idCardUrl?: string;
  paymentPlan: EnrollmentPaymentPlan;
  downPaymentAmount?: number;
  priceCurrency?: string;
  installmentCount?: EnrollmentInstallmentCount;
}

export interface EnrollmentApplicationResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  applicantUserId?: string;
  applicantEmailNorm: string;
  fullName: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  address: string;
  paymentProofUrl: string;
  idCardUrl?: string;
  paymentPlan: EnrollmentPaymentPlan;
  downPaymentAmount?: number;
  priceCurrency?: string;
  installmentCount?: EnrollmentInstallmentCount;
  status: EnrollmentApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
  reviewedByName?: string;
}

export interface EnrollmentApplicationReviewRequest {
  adminNote?: string;
}
