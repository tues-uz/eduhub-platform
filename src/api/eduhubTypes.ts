/** Types aligned with EduHub Platform API (Swagger). */

export type ApiRole =
  | "ADMIN"
  | "ADMIN_FINANCE"
  | "ADMIN_CONTENT"
  | "ADMIN_SUPPORT"
  | "ADMIN_ANALYTIC"
  | "LECTURER"
  | "STUDENT";

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  role: ApiRole;
  avatarUrl?: string;
  bio?: string;
  phoneNumber?: string;
  /** Teaching category for lecturers (assigned by admin). */
  category?: string;
  /** Parent or guardian contact from registration. */
  parentPhoneNumber?: string;
  /** Student passport / ID document number from registration. */
  passportNumber?: string;
  /** `YYYY-MM-DD` — student date of birth from registration. */
  dateOfBirth?: string;
  /** City where the student was born. */
  birthCity?: string;
  /** Most recent school the student attended. */
  latestSchool?: string;
  enabled?: boolean;
  passwordChanged?: boolean;
  createdAt?: string;
  coursesCount?: number;
  adminCode?: string;
}

export interface AdminCreateUserResponse {
  user: UserResponse;
  temporaryPassword: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  parentPhoneNumber: string;
  /** Student passport / ID document number from registration. */
  passportNumber: string;
  /** `YYYY-MM-DD` — used by admin to determine student age. */
  dateOfBirth: string;
  /** City where the student was born. */
  birthCity: string;
  /** Most recent school the student attended. */
  latestSchool: string;
  password: string;
  role: "STUDENT" | ApiRole;
}

export interface TeacherCourseRef {
  id: string;
  title: string;
  enrolled: number;
  capacity: number;
}

export interface TeacherResponse {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  enabled: boolean;
  createdAt: string;
  courses: TeacherCourseRef[];
  totalStudents: number;
  category?: string;
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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
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
  reviewedByCode?: string;
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
  lecturerAvatarUrl?: string;
  enrollmentCount?: number;
  /** Present when the API includes it on list endpoints; otherwise filled via GET /courses/{id}. */
  classMeetingsInSixMonths?: number;
  /** When the lecturer created the course (first submitted as draft). */
  createdAt: string;
  pricing?: CoursePricingResponse;
  classMeetingSlots?: ClassMeetingSlotDto[];
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

/** After first payment; 1 = one remaining instalment (2-month plan). */
export type EnrollmentInstallmentCount = 1 | 2 | 4 | 6 | 8;

/** How the student pays: cash at school or bank transfer. */
export type EnrollmentPaymentMethod = "CASH" | "BANK_TRANSFER";

export interface EnrollmentApplicationRequest {
  courseId: string;
  fullName: string;
  email: string;
  phone: string;
  phoneSecondary?: string;
  address: string;
  /** Omitted or placeholder when paymentMethod is CASH. */
  paymentProofUrl?: string;
  idCardUrl?: string;
  paymentMethod: EnrollmentPaymentMethod;
  paymentPlan: EnrollmentPaymentPlan;
  downPaymentAmount?: number;
  priceCurrency?: string;
  installmentCount?: EnrollmentInstallmentCount;
  /** 1-based meeting number the student joins from (inclusive). Default 1 = full schedule. */
  joinFromSessionNumber?: number;
  /** Total class meetings on the published schedule at enrollment time. */
  scheduleSessionCount?: number;
  /** Referral code entered by the student (optional). */
  referralCode?: string;
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
  paymentProofUrl?: string;
  idCardUrl?: string;
  paymentMethod?: EnrollmentPaymentMethod;
  paymentPlan: EnrollmentPaymentPlan;
  downPaymentAmount?: number;
  priceCurrency?: string;
  installmentCount?: EnrollmentInstallmentCount;
  joinFromSessionNumber?: number;
  scheduleSessionCount?: number;
  referralCode?: string;
  status: EnrollmentApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  adminNote?: string;
  reviewedByName?: string;
  /** Short admin identifier for audit trail (e.g. AF01). */
  reviewedByCode?: string;
  /** Official invoice number (e.g. INV.EDUHUB.1125-0008). Set when admin approves. */
  invoiceNumber?: string;
  /** Official receipt number (e.g. REC.EDUHUB.1125-0008). Set when admin approves. */
  receiptNumber?: string;
  /** ISO timestamp when invoice was issued. */
  invoiceIssuedAt?: string;
  /** ISO timestamp when receipt was issued. */
  receiptIssuedAt?: string;
  /** Amount recorded on the receipt (listed tuition or down payment). */
  amountPaid?: number;
}

export interface EnrollmentApplicationReviewRequest {
  adminNote?: string;
  /** Short admin identifier for audit trail (e.g. AF01). */
  adminActionCode?: string;
}

// Class Resume Types

export interface ClassResumeResponse {
  id: string;
  courseId: string;
  body: string;
  sessionSlotKey?: string;
  sessionLabel?: string;
  thumbnailUrl?: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassResumeRequest {
  body: string;
  sessionSlotKey?: string;
  sessionLabel?: string;
  thumbnailUrl?: string;
}

// Attendance Types

export type AttendanceModality = "ONLINE" | "IN_PERSON";
export type AttendanceSessionStatus = "OPEN" | "CLOSED";

export interface AttendanceSessionCreateRequest {
  meetingName?: string;
  modality?: AttendanceModality;
  scheduleSlotIndex?: number;
  scheduleSlotKey?: string;
}

export interface AttendanceSessionResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  meetingName: string;
  modality: AttendanceModality;
  status: AttendanceSessionStatus;
  scheduleSlotIndex?: number;
  scheduleSlotKey?: string;
  startedAt: string;
  endsAt: string;
  endedAt?: string;
  endReason?: string;
  presentCount?: number;
  enrolledCount?: number;
  token?: string;
}

export interface AttendanceJoinInfoResponse {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  meetingName: string;
  status: AttendanceSessionStatus;
  startedAt: string;
  endsAt: string;
  alreadyCheckedIn: boolean;
}

export interface AttendanceCheckInResponse {
  id: string;
  sessionId: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  checkedAt: string;
  alreadyRecorded: boolean;
}

export interface AttendanceRosterResponse {
  session: AttendanceSessionResponse;
  rows: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    present: boolean;
    checkedAt?: string;
  }[];
  summary: {
    present: number;
    absent: number;
    enrolled: number;
  };
}

export interface MyAttendanceResponse {
  courseId: string;
  courseTitle: string;
  summary: {
    attended: number;
    totalHeld: number;
    percentage: number;
  };
  sessions: {
    sessionId: string;
    meetingName: string;
    startedAt: string;
    status: AttendanceSessionStatus;
    present: boolean;
    checkedAt?: string;
  }[];
}

// Course Completion Types

export type CourseReviewTarget = "INSTRUCTOR" | "PLATFORM";

export interface CourseReviewRequest {
  target: CourseReviewTarget;
  rating: number;
  comment?: string;
}

export interface CourseReviewResponse {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string;
  target: CourseReviewTarget;
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface CourseReviewSummaryResponse {
  instructorRating: number | null;
  platformRating: number | null;
  instructorComment?: string;
  platformComment?: string;
  instructorSubmittedAt?: string;
  platformSubmittedAt?: string;
}

export interface CourseCertificateResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentEmailNorm: string;
  studentName: string;
  totalFinalScore: number;
  attendanceScore?: number;
  instructorScore?: number;
  certificateNumber: string;
  issuedAt: string;
  instructorName?: string;
  publishedByEmail?: string;
  reviewsComplete: boolean;
}

export interface FinalGradeRequest {
  instructorScore: number;
  comment?: string;
}

export interface CourseGradebookRowResponse {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attendanceAttended: number;
  attendanceTotal: number;
  attendanceScore: number | null;
  instructorScore: number | null;
  totalFinalScore: number | null;
  comment?: string;
  gradedAt?: string;
  gradedByEmail?: string;
  certificate?: CourseCertificateResponse;
  reviewSummary: CourseReviewSummaryResponse;
}

export type PayrollRequestStatus = "pending" | "approved" | "rejected";

export interface PayrollProofResponse {
  informationNotes?: string;
  fileName?: string;
  mimeType?: string;
  proofUrl?: string;
  uploadedAt?: string;
  approvedAt?: string;
}

export interface PayrollRequestResponse {
  id: string;
  submittedAt: string;
  courseId: string;
  classSection: string;
  course: string;
  instructor: UserResponse;
  instructorName: string;
  instructorEmailNorm: string;
  period?: string;
  periodLabel: string;
  sessionsTaught: string;
  requestedPayoutAmount?: number;
  requestedPayout: string;
  currency: string;
  payoutDetails: string;
  summary: string;
  instructorNotes: string;
  status: PayrollRequestStatus;
  resolvedAt?: string;
  adminNote?: string;
  reviewedByCode?: string;
  proof?: PayrollProofResponse;
}

export interface PayrollRequestCreateRequest {
  courseId: string;
  period?: string;
  periodLabel: string;
  sessionsTaught?: string;
  requestedPayoutAmount?: number;
  requestedPayout?: string;
  currency?: string;
  payoutDetails?: string;
  summary?: string;
  instructorNotes?: string;
}

export interface PayrollDecisionRequest {
  adminActionCode: string;
  adminNote?: string;
}

export interface PayrollProofUpdateRequest {
  informationNotes?: string;
  fileName?: string;
  mimeType?: string;
  proofUrl?: string;
  uploadedAt?: string;
}

export interface PayrollClassStudentResponse {
  id: string;
  fullName: string;
  email: string;
  amount?: number;
  currency: string;
  status: "paid" | "pending" | "overdue" | "enrolled";
  dueDate?: string | null;
  paidAt?: string | null;
  enrolledAt?: string;
}

export interface PayrollClassSummaryResponse {
  courseId: string;
  className: string;
  course: string;
  lecturerName: string;
  lecturerEmail?: string;
  enrollmentCount: number;
  tuitionPerStudent: number;
  currency: string;
  totalTuition: number;
  instructorShare: number;
  pricing?: CoursePricingResponse;
  students: PayrollClassStudentResponse[];
}

// Notification Types

export interface NotificationResponse {
  id: string;
  kind: string;
  title: string;
  body: string;
  href?: string;
  refId?: string;
  read: boolean;
  createdAt: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
}

