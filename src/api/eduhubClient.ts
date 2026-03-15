import { EDUHUB_API_BASE_URL, EDUHUB_API_PREFIX } from "./config";
import type {
  AuthResponse,
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
  Pageable,
  PageResponse,
  LessonProgressRequest,
  LessonProgressResponse,
} from "./eduhubTypes";

const BASE = EDUHUB_API_BASE_URL + EDUHUB_API_PREFIX;

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
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + expiresIn * 1000));
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

  const res = await fetch(url, { ...init, headers });
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
  if (!res.ok) {
    let message = res.statusText;
    try {
      const json = JSON.parse(text);
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Refresh tokens. Call this or rely on request() 401 retry. Returns true if new tokens were set. */
export async function refreshAuth(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch(BASE + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as AuthResponse;
  if (data.accessToken) {
    setAuthTokens(data.accessToken, data.refreshToken ?? refreshToken, data.expiresIn);
    return true;
  }
  return false;
}

/** Auth — login, me, refresh. Align with staging Swagger auth section. */
export const eduhubAuth = {
  login: (body: LoginRequest) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body), skipAuth: true }),

  register: (body: Record<string, any>) =>
    request<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(body), skipAuth: true }),

  verifyEmail: (token: string) =>
    request<void>(`/auth/verify-email?token=${token}`, { method: "POST", skipAuth: true }),

  me: () => request<{ id: string; fullName: string; email: string; role: string }>("/auth/me"),

  refresh: refreshAuth,
};

/** Courses */
export const eduhubCourses = {
  getAll: (params?: { page?: number; size?: number; category?: string; search?: string }) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 50));
    if (params?.category) sp.set("category", params.category);
    if (params?.search) sp.set("search", params.search);
    return request<PageResponse<CourseSummaryResponse>>(`/courses?${sp}`);
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
    return request<PageResponse<CourseSummaryResponse>>(`/courses/available?${sp}`);
  },

  getByLecturer: (lecturerId: string, params?: Pageable) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 50));
    return request<PageResponse<CourseSummaryResponse>>(`/courses/lecturer/${lecturerId}?${sp}`);
  },

  getEnrolledStudents: (courseId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<PageResponse<{ id: string; fullName: string; email: string; avatarUrl?: string }>>(
      `/courses/${courseId}/students?${sp}`
    );
  },

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

export interface QuizResultResponse {
  id: string;
  student: { id: string; fullName: string; email: string };
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
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
    request<PageResponse<{ id: string; fullName: string; email: string; avatarUrl?: string }>>(
      `/courses/${courseId}/students?page=${page}&size=${size}`
    ),
};

/** Admin */
export const eduhubAdmin = {
  getOverview: () => request<any>("/admin/overview"),
};

/** Assignments */
export const eduhubAssignments = {
  getByCourse: (courseId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<PageResponse<AssignmentResponse>>(`/courses/${courseId}/assignments?${sp}`);
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
    return request<PageResponse<SubmissionResponse>>(`/assignments/${assignmentId}/submissions?${sp}`);
  },

  gradeSubmission: (submissionId: string, body: GradeRequest) =>
    request<SubmissionResponse>(`/submissions/${submissionId}/grade`, { method: "PATCH", body: JSON.stringify(body) }),

  getPending: (lecturerId: string, priority?: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    if (priority) sp.set("priority", priority);
    return request<PageResponse<SubmissionResponse>>(`/lecturers/${lecturerId}/submissions/pending?${sp}`);
  },
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

/** Storage: file upload (returns URL). Use multipart/form-data; do not set Content-Type. */
export async function eduhubUploadFile(file: File, folder = "materials"): Promise<{ url: string }> {
  const url = `${BASE}/storage/upload?folder=${encodeURIComponent(folder)}`;
  const token = getAccessToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(url, { method: "POST", headers, body: formData });
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const json = JSON.parse(text);
      message = (json as { message?: string }).message ?? message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (!text) throw new Error("Empty response");
  return JSON.parse(text) as { url: string };
}
