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

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthTokens(): void {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
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

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();

  if (res.status === 401 && !skipAuth && !_retrying && getRefreshToken()) {
    try {
      const refreshed = await refreshAuth();
      if (refreshed) return request<T>(path, { ...options, _retrying: true });
    } catch {
      clearAuthTokens();
    }
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
    setAuthTokens(data.accessToken, data.refreshToken ?? refreshToken);
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

  getByLecturer: (lecturerId: string, params?: Pageable) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 50));
    return request<PageResponse<CourseSummaryResponse>>(`/courses/lecturer/${lecturerId}?${sp}`);
  },

  /**
   * Available courses from lecturers (Swagger: getMyCourses — GET /courses/my-courses).
   * Returns courses created by lecturers that the current user can browse/enroll in.
   */
  getAvailableCourses: (params?: Pageable) => {
    const sp = new URLSearchParams();
    sp.set("page", String(params?.page ?? 0));
    sp.set("size", String(params?.size ?? 100));
    return request<PageResponse<CourseSummaryResponse>>(`/courses/my-courses?${sp}`);
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
