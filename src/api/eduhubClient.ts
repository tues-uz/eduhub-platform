import { EDUHUB_API_BASE_URL, EDUHUB_API_PREFIX } from "./config";
import type {
  AuthResponse,
  UserResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  CourseRequest,
  CourseResponse,
  CourseSummaryResponse,
  ModuleRequest,
  ModuleResponse,
  LessonRequest,
  LessonResponse,
  LessonContentResponse,
  EnrollmentRequest,
  EnrollmentResponse,
  EnrollmentApplicationRequest,
  EnrollmentApplicationResponse,
  EnrollmentApplicationReviewRequest,
  Pageable,
  LessonProgressRequest,
  LessonProgressResponse,
  ApiResponse,
  ScheduleProposalRequest,
  ScheduleProposalResponse,
  TeacherResponse,
  ClassResumeResponse,
  ClassResumeRequest,
  AttendanceSessionCreateRequest,
  AttendanceSessionResponse,
  AttendanceJoinInfoResponse,
  AttendanceCheckInResponse,
  AttendanceRosterResponse,
  MyAttendanceResponse,
  AttendanceCourseSummaryResponse,
  QuizColumnRequest,
  QuizColumnResponse,
  NotificationResponse,
  AdminCreateUserResponse,
  CourseCertificateResponse,
  CourseGradebookRowResponse,
  CourseReviewRequest,
  CourseReviewResponse,
  CourseReviewSummaryResponse,
  FinalGradeRequest,
  PayrollClassSummaryResponse,
  PayrollDecisionRequest,
  PayrollProofUpdateRequest,
  PayrollRequestCreateRequest,
  PayrollRequestResponse,
  CategoryResponse,
  CourseLevelResponse,
  CourseLevelCreateRequest,
  CourseLevelUpdateRequest,
  SubstituteInviteResponse,
  SubstituteInviteCreateRequest,
  InstallmentPaymentResponse,
  InstallmentPaymentSubmitRequest,
  InstallmentPaymentReviewRequest,
  InstallmentPaymentManualRequest,
  QuizAttemptResponse,
  AssignmentSubmissionResponse,
  MarketingPromo,
  MarketingPromoInput,
  LandingPageContentResponse,
  AdminAttendanceRowResponse,
  AdminTransactionRowResponse,
  AdminClassRowResponse,
  AdminClassRosterRowResponse,
  AdminSwitchStudentRequest,
  AdminCalendarEventResponse,
  AdminSupportSessionResponse,
  AdminCertificationRowResponse,
  AdminPaymentRowResponse,
  GeneralReferralCodeResponse,
  SpecialTuitionGrantResponse,
  TeacherChecklistItemResponse,
  TeacherComplaintResponse,
} from "./eduhubTypes";



export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const BASE = EDUHUB_API_BASE_URL + EDUHUB_API_PREFIX;

const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;

function getRequestTimeoutMs(): number {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_EDUHUB_REQUEST_TIMEOUT_MS) {
    const n = Number(import.meta.env.VITE_EDUHUB_REQUEST_TIMEOUT_MS);
    if (Number.isFinite(n) && n >= 1000) return n;
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

const inMemoryTokens = {
  accessToken: typeof sessionStorage !== "undefined" ? sessionStorage.getItem("eduhub_at") : null,
  refreshToken: typeof sessionStorage !== "undefined" ? sessionStorage.getItem("eduhub_rt") : null,
  expiresAt: typeof sessionStorage !== "undefined" ? Number(sessionStorage.getItem("eduhub_exp") || 0) : 0,
};

export function getAccessToken(): string | null {
  return inMemoryTokens.accessToken;
}

export function setAuthTokens(accessToken: string, refreshToken: string, expiresIn: number = 3600): void {
  inMemoryTokens.accessToken = accessToken;
  inMemoryTokens.refreshToken = refreshToken;
  const expiresMs = expiresIn > 86_400 ? expiresIn : expiresIn * 1000;
  inMemoryTokens.expiresAt = Date.now() + expiresMs;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("eduhub_at", accessToken);
    sessionStorage.setItem("eduhub_rt", refreshToken);
    sessionStorage.setItem("eduhub_exp", String(inMemoryTokens.expiresAt));
  }
}

export function clearAuthTokens(): void {
  inMemoryTokens.accessToken = null;
  inMemoryTokens.refreshToken = null;
  inMemoryTokens.expiresAt = 0;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("eduhub_at");
    sessionStorage.removeItem("eduhub_rt");
    sessionStorage.removeItem("eduhub_exp");
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("eduhub_accessToken");
    localStorage.removeItem("eduhub_refreshToken");
    localStorage.removeItem("eduhub_expiresAt");
  }
}

export function getRefreshToken(): string | null {
  return inMemoryTokens.refreshToken;
}

function isTokenExpiringSoon(): boolean {
  if (!inMemoryTokens.expiresAt) return false;
  return Date.now() + TOKEN_REFRESH_BUFFER_MS > inMemoryTokens.expiresAt;
}

function toCamel(o: unknown): unknown {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(toCamel);
  const newObj: Record<string, unknown> = {};
  const sourceObj = o as Record<string, unknown>;
  for (const key in sourceObj) {
    const newKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
    newObj[newKey] = toCamel(sourceObj[key]);
  }
  return newObj;
}

/** API fields that stay camelCase in JSON (CreateUserRequest.adminCode per Swagger). */
const SNAKE_CASE_KEY_EXCEPTIONS = new Set(["adminCode"]);

function toSnake(o: unknown): unknown {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(toSnake);
  const newObj: Record<string, unknown> = {};
  const sourceObj = o as Record<string, unknown>;
  for (const key in sourceObj) {
    const newKey = SNAKE_CASE_KEY_EXCEPTIONS.has(key)
      ? key
      : key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    newObj[newKey] = toSnake(sourceObj[key]);
  }
  return newObj;
}

/** Auth API shape. Staging Swagger: https://hqhp7j.kubeletto.app/swagger-ui/index.html */
async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; _retrying?: boolean } = {}
): Promise<T> {
  const { skipAuth, _retrying, ...init } = options;
  const url = path.startsWith("http") ? path : BASE + path;
  const headers = new Headers(init.headers as HeadersInit);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  // Automatically convert body to snake_case if it's a JSON request
  if (init.body && typeof init.body === "string" && headers.get("Content-Type") === "application/json") {
    try {
      const parsed = JSON.parse(init.body);
      init.body = JSON.stringify(toSnake(parsed));
    } catch (e) {
      // Not valid JSON or already a string we shouldn't touch
    }
  }

  // Proactive token refresh before expiry
  if (!skipAuth && !_retrying && isTokenExpiringSoon() && getRefreshToken()) {
    try {
      await refreshAuth();
      const newToken = getAccessToken();
      if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
    } catch {
      // Continue with request, let it fail with 401 if needed
    }
  }

  const timeoutMs = getRequestTimeoutMs();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (e: unknown) {
    const aborted =
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e !== null && typeof e === "object" && (e as { name?: string }).name === "AbortError");
    if (aborted) {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. The API may be down or unreachable.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();

  if (res.status === 401 && !skipAuth && !_retrying && getRefreshToken()) {
    try {
      const refreshed = await refreshAuth();
      if (refreshed) {
        const newToken = getAccessToken();
        if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
        return request<T>(path, { ...options, headers, _retrying: true });
      }
    } catch {
      clearAuthTokens();
    }
  }

  if (res.status === 403) {
    throw new ApiError("Access denied. You don't have permission to perform this action.", 403);
  }

  if (res.status === 204) return undefined as T;

  let json: Record<string, unknown> | undefined;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON
  }

  if (!res.ok) {
    let message = res.statusText;
    if (json && !json.success && Array.isArray(json.errors) && json.errors.length > 0) {
      const firstError = json.errors[0];
      message = typeof firstError === "string" ? firstError : (firstError as Record<string, unknown>).message as string;
    } else if (json && json.message) {
      message = json.message as string;
    } else if (text) {
      message = text;
    }
    throw new ApiError(message, res.status);
  }

  if (!json) return undefined as T;

  // New contract: json is ApiResponse<T>
  const response = toCamel(json) as ApiResponse<T>;
  return response.data;
}

/** Single in-flight refresh so concurrent 401s / proactive refresh don't race the same refresh token. */
let refreshAuthInFlight: Promise<boolean> | null = null;

/** Refresh tokens. Call this or rely on request() 401 retry. Returns true if new tokens were set. */
export async function refreshAuth(): Promise<boolean> {
  if (!refreshAuthInFlight) {
    refreshAuthInFlight = (async (): Promise<boolean> => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const data = await request<AuthResponse>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
          skipAuth: true,
        });
        if (data?.accessToken) {
          setAuthTokens(data.accessToken, data.refreshToken ?? refreshToken, data.expiresIn);
          return true;
        }
      } catch (e) {
        console.error("Token refresh failed", e);
      }
      return false;
    })().finally(() => {
      refreshAuthInFlight = null;
    });
  }
  return refreshAuthInFlight;
}

/** Auth — login, me, refresh. Align with staging Swagger auth section. */
export const eduhubAuth = {
  login: (body: LoginRequest) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body), skipAuth: true }),

  register: (body: RegisterRequest) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body), skipAuth: true }),

  verifyEmail: (token: string) =>
    request<void>(`/auth/verify-email?token=${token}`, { method: "POST", skipAuth: true }),

  requestPasswordReset: (body: ForgotPasswordRequest) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
      skipAuth: true,
    }),

  resetPassword: (token: string, body: ResetPasswordRequest) =>
    request<void>(`/auth/reset-password?token=${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify(body),
      skipAuth: true,
    }),

  me: () => request<UserResponse>("/auth/me"),

  refresh: refreshAuth,

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<AuthResponse>("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),

  updateProfile: (body: {
    avatarUrl?: string;
    fullName?: string;
    passportImageUrl?: string;
    internationalPassportImageUrl?: string;
  }) =>
    request<{ id: string; fullName: string; email: string; role: string; avatarUrl?: string }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

/** Courses */
export const eduhubCourses = {
  getAll: (params?: {
    page?: number;
    size?: number;
    category?: string;
    search?: string;
    /** When supported by API (e.g. admin catalog), filter by course lifecycle status. */
    status?: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
  }) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 50));
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    return request<CourseSummaryResponse[]>(`/courses?${sp}`);
  },

  getById: (id: string, options?: { skipAuth?: boolean }) =>
    request<CourseResponse>(`/courses/${id}`, { skipAuth: options?.skipAuth }),

  create: (body: CourseRequest) =>
    request<CourseResponse>("/courses", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: CourseRequest) =>
    request<CourseResponse>(`/courses/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: string) => request<void>(`/courses/${id}`, { method: "DELETE" }),

  publish: (id: string) => request<void>(`/courses/${id}/publish`, { method: "PATCH" }),

  archive: (id: string) => request<void>(`/courses/${id}/archive`, { method: "PATCH" }),

  getEnrollmentCount: (id: string) => request<number>(`/courses/${id}/enrollment-count`),

  getAvailableCourses: (params?: { page?: number; size?: number; category?: string; search?: string }) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 50));
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    return request<CourseSummaryResponse[]>(`/courses/available?${sp}`);
  },

  getByLecturer: (lecturerId: string, params?: Pageable) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 50));
    return request<CourseSummaryResponse[]>(`/courses/lecturer/${lecturerId}?${sp}`);
  },

  getEnrolledStudents: (courseId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<{ id: string; fullName: string; email: string; avatarUrl?: string }[]>(
      `/courses/${courseId}/students?${sp}`
    );
  },

  getAllLessons: (courseId: string) =>
    request<LessonResponse[]>(`/courses/${courseId}/all-lessons`),

};

/** Modules */
export const eduhubModules = {
  getByCourse: (courseId: string) => request<ModuleResponse[]>(`/courses/${courseId}/modules`),

  create: (courseId: string, body: ModuleRequest) =>
    request<ModuleResponse>(`/courses/${courseId}/modules`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (courseId: string, moduleId: string, body: ModuleRequest) =>
    request<ModuleResponse>(`/courses/${courseId}/modules/${moduleId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (courseId: string, moduleId: string) =>
    request<void>(`/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" }),
};

/** Lessons */
export const eduhubLessons = {
  getByModule: (courseId: string, moduleId: string) =>
    request<LessonResponse[]>(`/courses/${courseId}/modules/${moduleId}/lessons`),

  get: (courseId: string, moduleId: string, lessonId: string) =>
    request<LessonResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`),

  getContent: (courseId: string, moduleId: string, lessonId: string) =>
    request<LessonContentResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/content`),

  create: (courseId: string, moduleId: string, body: LessonRequest) =>
    request<LessonResponse>(`/courses/${courseId}/modules/${moduleId}/lessons`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (courseId: string, moduleId: string, lessonId: string, body: Partial<LessonRequest>) =>
    request<LessonResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (courseId: string, moduleId: string, lessonId: string) =>
    request<void>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" }),

  publish: (courseId: string, moduleId: string, lessonId: string) =>
    request<LessonResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/publish`, {
      method: "PATCH",
    }),
};

/** Lesson progress */
export const eduhubLessonProgress = {
  get: (courseId: string, moduleId: string, lessonId: string) =>
    request<LessonProgressResponse>(
      `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/progress`
    ),

  mark: (courseId: string, moduleId: string, lessonId: string, body: LessonProgressRequest) =>
    request<LessonProgressResponse>(
      `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/progress`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  /** All of the current student's lesson-completion records for a course (one call instead of one per lesson). */
  listForCourse: (courseId: string) =>
    request<LessonProgressResponse[]>(`/courses/${courseId}/lesson-progress`),
};

/** Quiz - course-level standalone (placement tests / quizzes not tied to a lesson) */
export const eduhubCourseQuizzes = {
  list: (courseId: string) =>
    request<QuizResponse[]>(`/courses/${courseId}/quizzes`),

  listAll: () =>
    request<QuizResponse[]>("/lecturer/quizzes"),

  get: (courseId: string, quizId: string) =>
    request<QuizResponse>(`/courses/${courseId}/quizzes/${quizId}`),

  create: (courseId: string, body: QuizCreateRequest) =>
    request<QuizResponse>(`/courses/${courseId}/quizzes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (courseId: string, quizId: string, body: QuizCreateRequest) =>
    request<QuizResponse>(`/courses/${courseId}/quizzes/${quizId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (courseId: string, quizId: string) =>
    request<void>(`/courses/${courseId}/quizzes/${quizId}`, { method: "DELETE" }),

  publish: (courseId: string, quizId: string) =>
    request<QuizResponse>(`/courses/${courseId}/quizzes/${quizId}/publish`, { method: "PATCH" }),

  unpublish: (courseId: string, quizId: string) =>
    request<QuizResponse>(`/courses/${courseId}/quizzes/${quizId}/unpublish`, { method: "PATCH" }),

  getResults: (courseId: string, quizId: string) =>
    request<QuizResultResponse[]>(`/courses/${courseId}/quizzes/${quizId}/results`),

  getForStudent: (courseId: string, quizId: string) =>
    request<QuizResponseForStudent>(`/courses/${courseId}/quizzes/${quizId}/student`),

  listForStudent: (courseId: string) =>
    request<QuizResponseForStudent[]>(`/courses/${courseId}/quizzes/student`),

  submit: (courseId: string, quizId: string, body: QuizSubmissionRequest) =>
    request<QuizResultResponse>(`/courses/${courseId}/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMyResults: (courseId: string, quizId: string) =>
    request<QuizResultResponse[]>(`/courses/${courseId}/quizzes/${quizId}/my-results`),

  getPlacementTests: () =>
    request<QuizResponseForStudent[]>("/placement-tests"),

  getAllMyResults: () =>
    request<QuizResultResponse[]>("/quizzes/my-results"),

  /** The authenticated student's achieved placement levels, one per subject. */
  getMyPlacementResults: () =>
    request<StudentPlacementResultResponse[]>("/placement-results/me"),
};

/**
 * Placement test management — open to lecturers (who author the content) and admins. Tests are
 * institution-wide and scoped by subject — one published "Russian" test gates every Russian class,
 * not just the creator's own — so unlike per-class quizzes they carry no courseId.
 */
export const eduhubPlacementTestsAdmin = {
  list: () => request<PlacementTestAdminResponse[]>("/admin/placement-tests"),

  get: (quizId: string) =>
    request<PlacementTestAdminResponse>(`/admin/placement-tests/${quizId}`),

  create: (body: PlacementTestUpsertRequest) =>
    request<PlacementTestAdminResponse>("/admin/placement-tests", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (quizId: string, body: PlacementTestUpsertRequest) =>
    request<PlacementTestAdminResponse>(`/admin/placement-tests/${quizId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  setPublished: (quizId: string, publish: boolean) =>
    request<PlacementTestAdminResponse>(
      `/admin/placement-tests/${quizId}/publish?publish=${publish}`,
      { method: "PATCH" },
    ),

  delete: (quizId: string) =>
    request<void>(`/admin/placement-tests/${quizId}`, { method: "DELETE" }),
};

export interface PlacementTestOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface PlacementTestQuestion {
  id?: string;
  question: string;
  imageUrl?: string;
  explanation?: string;
  orderIndex?: number;
  points?: number;
  options: PlacementTestOption[];
}

export interface PlacementTestUpsertRequest {
  title: string;
  description?: string;
  /** Must match the Course.subject of the classes this test should gate (e.g. "Russian"). */
  subject: string;
  releaseDate?: string;
  releaseTime?: string;
  timeLimitMinutes?: number;
  passingScore?: number;
  /** Attempts allowed per student. Omit for unlimited. */
  maxAttempts?: number;
  isPublished?: boolean;
  questions: PlacementTestQuestion[];
  /** Required to publish: without bands no level is ever assigned. */
  bands: PlacementTestBand[];
}

export interface PlacementTestAdminResponse {
  id: string;
  title: string;
  description?: string;
  subject: string;
  releaseDate?: string;
  releaseTime?: string;
  timeLimitMinutes?: number;
  passingScore?: number;
  maxAttempts?: number;
  isPublished: boolean;
  questions: PlacementTestQuestion[];
  bands: PlacementTestBand[];
}

/** Quiz - tied to lessons (legacy) */
export const eduhubQuizzes = {
  listByCourse: (courseId: string) =>
    request<ApiResponse<QuizResponse[]>>(`/courses/${courseId}/quizzes`),

  createQuiz: (courseId: string, body: Partial<QuizResponse>) =>
    request<ApiResponse<QuizResponse>>(`/courses/${courseId}/quizzes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  submitAttempt: (quizId: string, body: { studentId: string; score: number; answersJson?: string }) =>
    request<ApiResponse<QuizAttemptResponse>>(`/quizzes/${quizId}/attempts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getAttempts: (quizId: string) =>
    request<ApiResponse<QuizAttemptResponse[]>>(`/quizzes/${quizId}/attempts`),

  get: (courseId: string, moduleId: string, lessonId: string) =>
    request<QuizResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz`),


  getResults: (courseId: string, moduleId: string, lessonId: string) =>
    request<QuizResultResponse[]>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/results`),

  publish: (courseId: string, moduleId: string, lessonId: string) =>
    request<QuizResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/publish`, { method: "PATCH" }),
};

/** Quiz request type */
export interface QuizCreateRequest {
  title: string;
  description?: string;
  /** Cover image shown on quiz cards in the class roster. */
  thumbnailUrl?: string;
  quizType?: "QUIZ" | "PLACEMENT_TEST";
  /** For placement tests: the subject a passing result qualifies the student in (e.g. "Russian"). */
  subject?: string;
  releaseDate?: string;
  releaseTime?: string;
  timeLimitMinutes?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  showCorrectAnswers?: boolean;
  courseId?: string;
  questions: {
    question: string;
    explanation?: string;
    imageUrl?: string;
    orderIndex?: number;
    points?: number;
    timeLimitSeconds?: number;
    options: {
      letter: string;
      text: string;
      isCorrect?: boolean;
    }[];
  }[];
}

/** Quiz types */
export interface QuizResponse {
  id: string;
  courseId?: string;
  lessonId?: string;
  title: string;
  description?: string;
  /** Cover image shown on quiz cards in the class roster. */
  thumbnailUrl?: string;
  quizType?: "QUIZ" | "PLACEMENT_TEST";
  /** For placement tests: the subject a passing result qualifies the student in (e.g. "Russian"). */
  subject?: string;
  releaseDate?: string;
  releaseTime?: string;
  timeLimitMinutes: number;
  passingScore: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
  questions: QuizQuestionResponse[];
}

export interface QuizQuestionResponse {
  id: string;
  question: string;
  imageUrl?: string;
  timeLimitSeconds?: number;
  points: number;
  options: QuizOptionResponse[];
}

export interface QuizOptionResponse {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizResponseForStudent {
  id: string;
  courseId?: string;
  lessonId?: string;
  title: string;
  description?: string;
  quizType?: "QUIZ" | "PLACEMENT_TEST";
  /** For placement tests: the subject a passing result qualifies the student in (e.g. "Russian"). */
  subject?: string;
  timeLimitMinutes: number;
  passingScore: number;
  questions: {
    id: string;
    question: string;
    imageUrl?: string;
    timeLimitSeconds?: number;
    points: number;
    options: {
      id: string;
      letter: string;
      text: string;
    }[];
  }[];
}

/** Admin/teacher-configured score-to-level band for a placement test. */
export interface PlacementTestBand {
  id?: string;
  quizId?: string;
  minScore: number;
  maxScore: number;
  levelCode: string;
}

/** A student's achieved level for one subject: their best placement test result, never demoted by a weaker retake. */
export interface StudentPlacementResultResponse {
  id: string;
  subject: string;
  levelCode: string;
  score: number;
  achievedAt: string;
}

export interface QuizSubmissionRequest {
  answers: {
    questionId: string;
    selectedOptionId: string;
  }[];
  timeSpentSeconds: number;
}

export interface QuizResultResponse {
  id: string;
  quizId?: string;
  student: { id: string; fullName: string; email: string };
  score: number;
  scorePercent: number;
  correctAnswers: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  completedAt: string;
}

/** Enrollments */
export const eduhubEnrollments = {
  getMy: () => request<EnrollmentResponse[]>("/enrollments/me"),

  enroll: (body: EnrollmentRequest) =>
    request<EnrollmentResponse>("/enrollments", { method: "POST", body: JSON.stringify(body) }),

  get: (id: string) => request<EnrollmentResponse>(`/enrollments/${id}`),

  updateProgress: (id: string, percentage: number) =>
    request<EnrollmentResponse>(`/enrollments/${id}/progress?percentage=${percentage}`, {
      method: "PATCH",
    }),

  markComplete: (id: string) =>
    request<void>(`/enrollments/${id}/complete`, { method: "PATCH" }),
};

/** Enrollment Applications (Student) */
export const eduhubEnrollmentApplications = {
  submit: (body: EnrollmentApplicationRequest) =>
    request<EnrollmentApplicationResponse>("/enrollment-applications", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getMy: (email: string) =>
    request<EnrollmentApplicationResponse[]>(`/enrollment-applications/me?email=${encodeURIComponent(email)}`),

  getMyPending: (courseId: string, email: string) =>
    request<EnrollmentApplicationResponse[]>(
      `/enrollment-applications/me/pending?courseId=${courseId}&email=${encodeURIComponent(email)}`
    ),

  get: (id: string) =>
    request<EnrollmentApplicationResponse>(`/enrollment-applications/${id}`),
};

/** Enrollment Applications (Admin) */
export const eduhubAdminEnrollmentApplications = {
  listAll: () =>
    request<EnrollmentApplicationResponse[]>("/admin/enrollment-applications"),

  get: (id: string) =>
    request<EnrollmentApplicationResponse>(`/admin/enrollment-applications/${id}`),

  approve: (id: string, body?: EnrollmentApplicationReviewRequest) =>
    request<EnrollmentApplicationResponse>(`/admin/enrollment-applications/${id}/approve`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  reject: (id: string, body?: EnrollmentApplicationReviewRequest) =>
    request<EnrollmentApplicationResponse>(`/admin/enrollment-applications/${id}/reject`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

/** Lecturer - stats and student management */
export const eduhubLecturer = {
  getStats: () => request<{
    totalCourses: number;
    totalStudents: number;
    activeEnrollments: number;
    completedEnrollments: number;
    pendingGrading: number;
  }>("/lecturers/me/stats"),

  getEnrolledStudents: (courseId: string, page = 0, size = 20) =>
    request<{ id: string; fullName: string; email: string; avatarUrl?: string }[]>(
      `/courses/${courseId}/students?page=${page}&size=${size}`
    ),

  getAllStudents: (lecturerId: string) =>
    request<
      {
        id: string;
        fullName: string;
        email: string;
        avatarUrl?: string;
        courseTitle: string;
        enrolledAt: string;
      }[]
    >(`/lecturers/${lecturerId}/all-students`),
};

/** Admin */
export const eduhubAdmin = {
  getOverview: () => request<unknown>("/admin/overview"),

  reviewCourse: (id: string, body: {
    decision: "APPROVE" | "REJECT";
    priceAmount?: number;
    currency?: string;
    referralCode?: string;
    discountPercent?: number;
    trialCode?: string;
    rejectionReason?: string;
    adminActionCode?: string;
  }) => request<CourseResponse>(`/admin/courses/${id}/review`, { method: "PATCH", body: JSON.stringify(body) }),

  /** Updates referral/discount/trial code on an already-published course without re-triggering approval/publish side effects. */
  updateCoursePricing: (id: string, body: {
    referralCode?: string;
    discountPercent?: number;
    trialCode?: string;
    adminActionCode?: string;
  }) => request<CourseResponse>(`/admin/courses/${id}/pricing`, { method: "PATCH", body: JSON.stringify(body) }),

  createUser: (body: {
    fullName: string;
    email: string;
    phoneNumber: string;
    role: string;
    adminCode?: string;
    category?: string;
  }) =>
    request<AdminCreateUserResponse>("/admin/users", { method: "POST", body: JSON.stringify(body) }),

  listUsers: (params?: { role?: string; enabled?: boolean; search?: string; page?: number; size?: number }) => {
    const sp = new URLSearchParams();
    if (params?.role) sp.set("role", params.role);
    if (params?.enabled !== undefined) sp.set("enabled", String(params.enabled));
    if (params?.search) sp.set("search", params.search);
    if (params?.page !== undefined) sp.set("page", String(params.page));
    if (params?.size !== undefined) sp.set("size", String(params.size));
    return request<{ content: UserResponse[]; totalElements: number; totalPages: number; number: number; size: number }>(`/admin/users?${sp}`);
  },

  setUserStatus: (id: string, enabled: boolean) =>
    request<UserResponse>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ enabled }) }),

  resetUserPassword: (id: string) =>
    request<AdminCreateUserResponse>(`/admin/users/${id}/reset-password`, { method: "POST" }),

  setInstructorRevenueShare: (id: string, instructorRevenueShare: number | null, adminActionCode: string) =>
    request<UserResponse>(`/admin/users/${id}/revenue-share`, {
      method: "PATCH",
      body: JSON.stringify({ instructorRevenueShare, adminActionCode }),
    }),

  listTeachers: () =>
    request<TeacherResponse[]>("/admin/teachers"),

  proposeSchedule: (courseId: string, body: ScheduleProposalRequest) =>
    request<ScheduleProposalResponse>(`/admin/courses/${courseId}/schedule`, { method: "POST", body: JSON.stringify(body) }),
};

export const eduhubAdminOverview = eduhubAdmin;

/** Referral / discount / trial codes */
export const eduhubReferralCodes = {
  /** General (single server-side row) settings; visible to authenticated users so enrollment can preview discounts. */
  getGeneral: () => request<GeneralReferralCodeResponse>("/referral-codes/general"),

  /** Admin-only update of the general referral/discount/trial code settings. */
  updateGeneral: (body: {
    referralCode?: string;
    discountPercent?: number;
    trialCode?: string;
    adminActionCode?: string;
  }) =>
    request<GeneralReferralCodeResponse>("/admin/referral-codes/general", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

/** Teacher manual quiz grading (extra assessment columns beyond attendance/final score). */
export const eduhubQuizGrading = {
  listColumns: (courseId: string) =>
    request<QuizColumnResponse[]>(`/courses/${courseId}/quiz-columns`),

  addColumn: (courseId: string, body: QuizColumnRequest) =>
    request<QuizColumnResponse>(`/courses/${courseId}/quiz-columns`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  renameColumn: (courseId: string, columnId: string, title: string) =>
    request<QuizColumnResponse>(`/courses/${courseId}/quiz-columns/${columnId}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    }),

  deleteColumn: (courseId: string, columnId: string) =>
    request<void>(`/courses/${courseId}/quiz-columns/${columnId}`, { method: "DELETE" }),

  getScores: (courseId: string) =>
    request<Record<string, Record<string, number>>>(`/courses/${courseId}/quiz-columns/scores`),

  saveStudentScores: (courseId: string, studentId: string, scores: Record<string, number | null>) =>
    request<void>(`/courses/${courseId}/quiz-columns/scores/${studentId}`, {
      method: "PUT",
      body: JSON.stringify({ scores }),
    }),
};

export const eduhubPayroll = {
  getClasses: () => request<PayrollClassSummaryResponse[]>("/payroll/classes"),

  listRequests: (params?: { status?: "PENDING" | "APPROVED" | "REJECTED"; instructorId?: string; courseId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.instructorId) sp.set("instructorId", params.instructorId);
    if (params?.courseId) sp.set("courseId", params.courseId);
    const qs = sp.toString();
    return request<PayrollRequestResponse[]>(`/payroll/requests${qs ? `?${qs}` : ""}`);
  },

  submitRequest: (body: PayrollRequestCreateRequest) =>
    request<PayrollRequestResponse>("/payroll/requests", { method: "POST", body: JSON.stringify(body) }),

  getRequest: (id: string) => request<PayrollRequestResponse>(`/payroll/requests/${id}`),

  approveRequest: (id: string, body: PayrollDecisionRequest) =>
    request<PayrollRequestResponse>(`/payroll/requests/${id}/approve`, { method: "PATCH", body: JSON.stringify(body) }),

  rejectRequest: (id: string, body: PayrollDecisionRequest) =>
    request<PayrollRequestResponse>(`/payroll/requests/${id}/reject`, { method: "PATCH", body: JSON.stringify(body) }),

  updateProof: (id: string, body: PayrollProofUpdateRequest) =>
    request<PayrollRequestResponse>(`/payroll/requests/${id}/proof`, { method: "PATCH", body: JSON.stringify(body) }),

  approveProof: (id: string) =>
    request<PayrollRequestResponse>(`/payroll/requests/${id}/proof/approve`, { method: "POST" }),
};

/** Schedule Workflow */
export const eduhubSchedule = {
  getProposal: (courseId: string, options?: { skipAuth?: boolean }) =>
    request<ScheduleProposalResponse>(`/courses/${courseId}/schedule`, {
      skipAuth: options?.skipAuth,
    }),

  approve: (courseId: string) =>
    request<ScheduleProposalResponse>(`/courses/${courseId}/schedule/approve`, { method: "PATCH" }),

  reject: (courseId: string, rejectionNote?: string) =>
    request<ScheduleProposalResponse>(`/courses/${courseId}/schedule/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionNote }),
    }),
};

/** Class Resumes */
export const eduhubClassResumes = {
  list: (courseId: string) =>
    request<ClassResumeResponse[]>(`/courses/${courseId}/resumes`),

  get: (courseId: string, resumeId: string) =>
    request<ClassResumeResponse>(`/courses/${courseId}/resumes/${resumeId}`),

  create: (courseId: string, body: ClassResumeRequest) =>
    request<ClassResumeResponse>(`/courses/${courseId}/resumes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (courseId: string, resumeId: string, body: ClassResumeRequest) =>
    request<ClassResumeResponse>(`/courses/${courseId}/resumes/${resumeId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (courseId: string, resumeId: string) =>
    request<void>(`/courses/${courseId}/resumes/${resumeId}`, { method: "DELETE" }),
};

/** Attendance */
export const eduhubAttendance = {
  createSession: (courseId: string, body: AttendanceSessionCreateRequest) =>
    request<AttendanceSessionResponse>(`/courses/${courseId}/attendance/sessions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listSessions: (courseId: string) =>
    request<AttendanceSessionResponse[]>(`/courses/${courseId}/attendance/sessions`),

  /** My currently open attendance sessions across all classes (for the "you left one open elsewhere" check). */
  myOpenSessions: () =>
    request<AttendanceSessionResponse[]>("/attendance/sessions/mine/open"),

  closeSession: (sessionId: string, reason = "MANUAL_STOP") =>
    request<AttendanceSessionResponse>(`/attendance/sessions/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  joinInfo: (token: string) =>
    request<AttendanceJoinInfoResponse>(`/attendance/join-info?token=${encodeURIComponent(token)}`),

  checkIn: (token: string) =>
    request<AttendanceCheckInResponse>("/attendance/check-ins", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  roster: (courseId: string, sessionId: string) =>
    request<AttendanceRosterResponse>(`/courses/${courseId}/attendance/sessions/${sessionId}/roster`),

  myAttendance: (courseId: string) =>
    request<MyAttendanceResponse>(`/courses/${courseId}/attendance/my`),

  summary: (courseId: string) =>
    request<AttendanceCourseSummaryResponse>(`/courses/${courseId}/attendance/summary`),
};

/** Course completion: grades, certificates, and reviews */
export const eduhubCompletion = {
  gradebook: (courseId: string) =>
    request<CourseGradebookRowResponse[]>(`/courses/${courseId}/grades`),

  saveGrade: (courseId: string, studentId: string, body: FinalGradeRequest) =>
    request<CourseGradebookRowResponse>(`/courses/${courseId}/grades/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  publishCertificate: (courseId: string, studentId: string) =>
    request<CourseCertificateResponse>(`/courses/${courseId}/certificates/${studentId}/publish`, {
      method: "POST",
    }),

  publishAllCertificates: (courseId: string) =>
    request<CourseCertificateResponse[]>(`/courses/${courseId}/certificates/publish-all`, {
      method: "POST",
    }),

  myCertificates: () =>
    request<CourseCertificateResponse[]>("/certificates/me"),

  submitReview: (courseId: string, body: CourseReviewRequest) =>
    request<CourseReviewResponse>(`/courses/${courseId}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listCourseReviews: (courseId: string, params?: { target?: "INSTRUCTOR" | "PLATFORM"; limit?: number }) => {
    const sp = new URLSearchParams();
    sp.set("target", params?.target ?? "INSTRUCTOR");
    sp.set("limit", String(params?.limit ?? 3));
    return request<CourseReviewResponse[]>(`/courses/${courseId}/reviews?${sp}`);
  },

  myReviewSummary: (courseId: string) =>
    request<CourseReviewSummaryResponse>(`/courses/${courseId}/reviews/me`),
};

/** Notifications */
export const eduhubNotifications = {
  list: () => request<NotificationResponse[]>("/notifications"),

  unreadCount: () => request<{ count: number }>("/notifications/unread-count"),

  markRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: () =>
    request<void>("/notifications/read-all", { method: "PATCH" }),
};

/** Assignments */
export const eduhubAssignments = {
  getByCourse: (courseId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<AssignmentResponse[]>(`/courses/${courseId}/assignments?${sp}`);
  },

  create: (courseId: string, body: AssignmentRequest) =>
    request<AssignmentResponse>(`/courses/${courseId}/assignments`, { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: AssignmentRequest) =>
    request<AssignmentResponse>(`/assignments/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: string) => request<void>(`/assignments/${id}`, { method: "DELETE" }),

  getSubmissions: (assignmentId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<SubmissionResponse[]>(`/assignments/${assignmentId}/submissions?${sp}`);
  },

  gradeSubmission: (submissionId: string, body: GradeRequest) =>
    request<SubmissionResponse>(`/submissions/${submissionId}/grade`, { method: "PATCH", body: JSON.stringify(body) }),

  getPending: (lecturerId: string, priority?: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    if (priority) sp.set("priority", priority);
    return request<SubmissionResponse[]>(`/lecturers/${lecturerId}/submissions/pending?${sp}`);
  },

  submit: (assignmentId: string, body: SubmissionRequest) =>
    request<SubmissionResponse>(`/assignments/${assignmentId}/submissions`, { method: "POST", body: JSON.stringify(body) }),

  getMySubmission: (assignmentId: string) =>
    request<SubmissionResponse | null>(`/assignments/${assignmentId}/my-submission`),
};

export interface AssignmentRequest {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  maxScore?: number;
  attachments?: string[];
  status?: "DRAFT" | "PUBLISHED" | "CLOSED";
}

export interface AssignmentResponse {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  maxScore: number;
  attachments: string[];
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  course: { id: string; title: string };
  lecturer: { id: string; fullName: string };
  createdAt: string;
}

export interface SubmissionResponse {
  id: string;
  content: string;
  attachments: string[];
  status: "SUBMITTED" | "GRADED" | "RETURNED";
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: { id: string; fullName: string };
  score?: number;
  feedback?: string;
  assignment: AssignmentResponse;
  student: { id: string; fullName: string; email: string };
}

export interface GradeRequest {
  score: number;
  feedback?: string;
}

export interface SubmissionRequest {
  content: string;
  attachments?: string[];
}

/** Storage: presigned URL upload flow. Returns the public URL of the uploaded file. */
export async function eduhubUploadFile(file: File, folder = "materials"): Promise<{ url: string }> {
  // Step 1: Get presigned URL from backend
  const presignedResponse = await request<{ uploadUrl: string; publicUrl: string; key: string }>(
    "/storage/presigned-url",
    {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
      }),
    }
  );

  // Step 2: Upload file directly to R2 using presigned URL
  const uploadTimeoutMs = 120_000;
  const uploadController = new AbortController();
  const uploadTimer = setTimeout(() => uploadController.abort(), uploadTimeoutMs);

  try {
    const uploadRes = await fetch(presignedResponse.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
      signal: uploadController.signal,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed with status ${uploadRes.status}`);
    }
  } catch (e: unknown) {
    const aborted =
      (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
      (e !== null && typeof e === "object" && (e as { name?: string }).name === "AbortError");
    if (aborted) {
      throw new Error(`Upload timed out after ${uploadTimeoutMs / 1000}s. Try a smaller file.`);
    }
    throw e;
  } finally {
    clearTimeout(uploadTimer);
  }

  // Step 3: Return the public URL
  return { url: presignedResponse.publicUrl };
}

export const eduhubCategories = {
  getAll: () => request<CategoryResponse[]>("/categories"),
  getAllAdmin: () => request<CategoryResponse[]>("/categories/admin"),
  create: (name: string) =>
    request<CategoryResponse>("/categories/admin", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  delete: (name: string) =>
    request<void>(`/categories/admin/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};

export const eduhubCourseLevels = {
  getAll: () => request<CourseLevelResponse[]>("/course-levels"),
  getAllAdmin: () => request<CourseLevelResponse[]>("/course-levels/admin"),
  create: (body: CourseLevelCreateRequest) =>
    request<CourseLevelResponse>("/course-levels/admin", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  update: (id: string, body: CourseLevelUpdateRequest) =>
    request<CourseLevelResponse>(`/course-levels/admin/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    request<void>(`/course-levels/admin/${id}`, {
      method: "DELETE",
    }),
};

export const eduhubSubstituteInvites = {
  create: (courseId: string, body: SubstituteInviteCreateRequest) =>
    request<SubstituteInviteResponse>(`/courses/${courseId}/substitute-invites`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listMine: () => request<SubstituteInviteResponse[]>("/substitute-invites/mine"),

  getById: (id: string) => request<SubstituteInviteResponse>(`/substitute-invites/${id}`),

  accept: (id: string) => request<SubstituteInviteResponse>(`/substitute-invites/${id}/accept`, { method: "POST" }),

  decline: (id: string) => request<SubstituteInviteResponse>(`/substitute-invites/${id}/decline`, { method: "POST" }),

  primaryApprove: (id: string) =>
    request<SubstituteInviteResponse>(`/substitute-invites/${id}/primary-approve`, { method: "POST" }),

  primaryReject: (id: string) =>
    request<SubstituteInviteResponse>(`/substitute-invites/${id}/primary-reject`, { method: "POST" }),

  cancel: (id: string) => request<SubstituteInviteResponse>(`/substitute-invites/${id}/cancel`, { method: "POST" }),
};

export const eduhubAdminSubstituteInvites = {
  listAll: () => request<SubstituteInviteResponse[]>("/admin/substitute-invites"),

  approve: (id: string) =>
    request<SubstituteInviteResponse>(`/admin/substitute-invites/${id}/approve`, { method: "POST" }),

  reject: (id: string) =>
    request<SubstituteInviteResponse>(`/admin/substitute-invites/${id}/reject`, { method: "POST" }),
};

/** Schedule-month (installment) payments (Student) */
export const eduhubInstallmentPayments = {
  listForApplication: (applicationId: string) =>
    request<InstallmentPaymentResponse[]>(`/enrollment-applications/${applicationId}/installment-payments`),

  submit: (applicationId: string, body: InstallmentPaymentSubmitRequest) =>
    request<InstallmentPaymentResponse>(`/enrollment-applications/${applicationId}/installment-payments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

/** Schedule-month (installment) payments (Admin) */
export const eduhubAdminInstallmentPayments = {
  listAll: () => request<InstallmentPaymentResponse[]>("/admin/installment-payments"),

  approve: (id: string, body?: InstallmentPaymentReviewRequest) =>
    request<InstallmentPaymentResponse>(`/admin/installment-payments/${id}/approve`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  reject: (id: string, body?: InstallmentPaymentReviewRequest) =>
    request<InstallmentPaymentResponse>(`/admin/installment-payments/${id}/reject`, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  manualRecord: (applicationId: string, body: InstallmentPaymentManualRequest) =>
    request<InstallmentPaymentResponse>(
      `/admin/enrollment-applications/${applicationId}/installment-payments/manual`,
      { method: "POST", body: JSON.stringify(body) },
    ),
};

export const eduhubAdminInstallments = eduhubAdminInstallmentPayments;

/** Marketing Promos (carousel banners) API */
export const eduhubMarketingPromos = {
  listAll: () => request<MarketingPromo[]>("/admin/marketing-promos"),

  listActive: () => request<MarketingPromo[]>("/marketing-promos"),

  createPromo: (body: MarketingPromoInput) =>
    request<MarketingPromo>("/admin/marketing-promos", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updatePromo: (id: string, body: MarketingPromoInput) =>
    request<MarketingPromo>(`/admin/marketing-promos/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deletePromo: (id: string) =>
    request<void>(`/admin/marketing-promos/${id}`, { method: "DELETE" }),
};

/** Newsletter API */
export const eduhubNewsletter = {
  subscribe: (email: string) =>
    request<void>("/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

/** Landing Page CMS API */
export const eduhubLandingPage = {
  getContent: () => request<LandingPageContentResponse[]>("/landing-page"),

  updateSection: (sectionKey: string, contentJson: string) =>
    request<LandingPageContentResponse>(`/admin/landing-page/${sectionKey}`, {
      method: "PUT",
      body: JSON.stringify({ contentJson }),
    }),
};

export const eduhubAdminAttendance = {
  listAll: () => request<AdminAttendanceRowResponse[]>("/admin/attendance"),
};

export const eduhubAdminTransactions = {
  listAll: () => request<AdminTransactionRowResponse[]>("/admin/transactions"),
};

export const eduhubAdminClasses = {
  listAll: () => request<AdminClassRowResponse[]>("/admin/classes"),
  getRoster: (courseId: string) => request<AdminClassRosterRowResponse[]>(`/admin/classes/${courseId}/roster`),
  assignStudent: (courseId: string, studentId: string) =>
    request<AdminClassRosterRowResponse>(`/admin/classes/${courseId}/assign`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    }),
  switchStudent: (data: AdminSwitchStudentRequest) =>
    request<AdminClassRosterRowResponse>("/admin/classes/switch-student", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeStudent: (courseId: string, studentId: string) =>
    request<string>(`/admin/classes/${courseId}/students/${studentId}`, {
      method: "DELETE",
    }),
};

export const eduhubAdminCalendar = {
  listEvents: () => request<AdminCalendarEventResponse[]>("/admin/calendar/events"),
};

export const eduhubAdminSupport = {
  listAll: () => request<AdminSupportSessionResponse[]>("/admin/support-sessions"),
  approve: (id: string) =>
    request<AdminSupportSessionResponse>(`/admin/support-sessions/${id}/approve`, { method: "POST" }),
  scheduleSlot: (id: string, meetingSlot: string) =>
    request<AdminSupportSessionResponse>(`/admin/support-sessions/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ meetingSlot }),
    }),
};

export const eduhubAdminCertifications = {
  listAll: () => request<AdminCertificationRowResponse[]>("/admin/certifications"),
  issue: (id: string) =>
    request<AdminCertificationRowResponse>(`/admin/certifications/${id}/issue`, { method: "POST" }),
};

export const eduhubAdminPayments = {
  listAll: () => request<AdminPaymentRowResponse[]>("/admin/payments"),
  markPaid: (id: string, data: { paidAt?: string; paymentMethod?: string; reference?: string }) =>
    request<AdminPaymentRowResponse>(`/admin/payments/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sendReminders: (paymentIds: string[]) =>
    request<string>("/admin/payments/remind", {
      method: "POST",
      body: JSON.stringify({ paymentIds }),
    }),
};

/** Special (free-tuition) grants */
export const eduhubAdminTuitionGrants = {
  list: () => request<SpecialTuitionGrantResponse[]>("/admin/tuition-grants"),
  upsert: (body: {
    email: string;
    courseId?: string | null;
    note?: string;
    active?: boolean;
    adminActionCode: string;
  }) =>
    request<SpecialTuitionGrantResponse>("/admin/tuition-grants", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  remove: (id: string, adminActionCode: string) =>
    request<void>(`/admin/tuition-grants/${id}?adminActionCode=${encodeURIComponent(adminActionCode)}`, {
      method: "DELETE",
    }),
};

export const eduhubTuitionGrants = {
  /** Active free-tuition grant for the authenticated student on this course, if any. */
  myGrant: (courseId: string) =>
    request<SpecialTuitionGrantResponse | null>(`/tuition-grants/me?courseId=${encodeURIComponent(courseId)}`),
};

/** Per-instructor, per-course class checklist */
export const eduhubTeacherChecklist = {
  list: (courseId: string) =>
    request<TeacherChecklistItemResponse[]>(`/courses/${courseId}/checklist`),
  setItem: (courseId: string, itemKey: string, body: { title: string; completed: boolean }) =>
    request<TeacherChecklistItemResponse>(`/courses/${courseId}/checklist/${encodeURIComponent(itemKey)}`, {
      method: "PUT",
      body: JSON.stringify({ itemKey, ...body }),
    }),
};

/** Teacher / class complaints */
export const eduhubComplaints = {
  submit: (body: { courseId: string; category: "teacher" | "class" | "other"; mood: 1 | 2 | 3 | 4 | 5; message: string }) =>
    request<TeacherComplaintResponse>("/complaints", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const eduhubAdminComplaints = {
  list: () => request<TeacherComplaintResponse[]>("/admin/complaints"),
  markReviewed: (id: string) =>
    request<TeacherComplaintResponse>(`/admin/complaints/${id}/reviewed`, { method: "PATCH" }),
};



