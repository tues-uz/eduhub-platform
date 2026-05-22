import { EDUHUB_API_BASE_URL, EDUHUB_API_PREFIX } from "./config";
import type {
  AuthResponse,
  UserResponse,
  LoginRequest,
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
  NotificationResponse,
} from "./eduhubTypes";

const BASE = EDUHUB_API_BASE_URL + EDUHUB_API_PREFIX;

const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;

function getRequestTimeoutMs(): number {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_EDUHUB_REQUEST_TIMEOUT_MS) {
    const n = Number(import.meta.env.VITE_EDUHUB_REQUEST_TIMEOUT_MS);
    if (Number.isFinite(n) && n >= 1000) return n;
  }
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

const AUTH_ACCESS_TOKEN_KEY = "eduhub_accessToken";
const AUTH_REFRESH_TOKEN_KEY = "eduhub_refreshToken";
const AUTH_EXPIRES_AT_KEY = "eduhub_expiresAt";

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string, expiresIn: number = 3600): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  const expiresMs = expiresIn > 86_400 ? expiresIn : expiresIn * 1000;
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + expiresMs));
}

export function clearAuthTokens(): void {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

function isTokenExpiringSoon(): boolean {
  const expiresAt = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
  if (!expiresAt) return false;
  return Date.now() + TOKEN_REFRESH_BUFFER_MS > parseInt(expiresAt, 10);
}

function toCamel(o: any): any {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(toCamel);
  const newObj: any = {};
  for (const key in o) {
    const newKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
    newObj[newKey] = toCamel(o[key]);
  }
  return newObj;
}

function toSnake(o: any): any {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(toSnake);
  const newObj: any = {};
  for (const key in o) {
    const newKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
    newObj[newKey] = toSnake(o[key]);
  }
  return newObj;
}

/** Auth API shape. Staging Swagger: https://eduhub-platform-api-staging.kubeletto.app/swagger-ui/index.html */
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
    throw new Error("Access denied. You don't have permission to perform this action.");
  }

  if (res.status === 204) return undefined as T;

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // Not JSON
  }

  if (!res.ok) {
    let message = res.statusText;
    if (json && !json.success && json.errors && json.errors.length > 0) {
      const firstError = json.errors[0];
      message = typeof firstError === "string" ? firstError : firstError.message;
    } else if (json && json.message) {
      message = json.message;
    } else if (text) {
      message = text;
    }
    throw new Error(message);
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

  register: (body: Record<string, any>) =>
    request<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(body), skipAuth: true }),

  verifyEmail: (token: string) =>
    request<void>(`/auth/verify-email?token=${token}`, { method: "POST", skipAuth: true }),

  me: () =>
    request<{ id: string; fullName: string; email: string; role: string; avatarUrl?: string }>("/auth/me"),

  refresh: refreshAuth,

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<AuthResponse>("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
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

  getById: (id: string) => request<CourseResponse>(`/courses/${id}`),

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
};

/** Quiz - tied to lessons (legacy) */
export const eduhubQuizzes = {
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
  quizType?: "QUIZ" | "PLACEMENT_TEST";
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
  quizType?: "QUIZ" | "PLACEMENT_TEST";
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
    request<{ id: string; fullName: string; email: string; courseTitle: string; enrolledAt: string }[]>(
      `/lecturers/${lecturerId}/all-students`
    ),
};

/** Admin */
export const eduhubAdmin = {
  getOverview: () => request<any>("/admin/overview"),

  reviewCourse: (id: string, body: {
    decision: "APPROVE" | "REJECT";
    priceAmount?: number;
    currency?: string;
    referralCode?: string;
    discountPercent?: number;
    rejectionReason?: string;
  }) => request<CourseResponse>(`/admin/courses/${id}/review`, { method: "PATCH", body: JSON.stringify(body) }),

  createUser: (body: { fullName: string; email: string; phoneNumber: string; role: string }) =>
    request<UserResponse>("/admin/users", { method: "POST", body: JSON.stringify(body) }),

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

  listTeachers: () =>
    request<TeacherResponse[]>("/admin/teachers"),

  proposeSchedule: (courseId: string, body: ScheduleProposalRequest) =>
    request<ScheduleProposalResponse>(`/admin/courses/${courseId}/schedule`, { method: "POST", body: JSON.stringify(body) }),
};

/** Schedule Workflow */
export const eduhubSchedule = {
  getProposal: (courseId: string) =>
    request<ScheduleProposalResponse>(`/courses/${courseId}/schedule`),

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
