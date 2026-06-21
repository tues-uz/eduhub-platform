/**
 * EduHub Platform API — staging base URL.
 * API: https://svc-c6848ae1-kl-caa1669c-caa1669c.kubeletto.app (Swagger: /swagger-ui/index.html)
 * Auth: login (POST /auth/login), me (GET /auth/me), refresh (POST /auth/refresh),
 * forgot-password (POST /auth/forgot-password), reset-password (POST /auth/reset-password?token=).
 * Verify request/response shapes in Swagger when the API is available.
 *
 * Local dev: if `VITE_EDUHUB_API_BASE_URL` is unset, the client uses a relative origin
 * (`/api/v1/...`) so Vite can proxy to the real API — same-origin requests work better
 * with strict privacy browsers than cross-origin `fetch` to another host.
 */
const fromEnv =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_EDUHUB_API_BASE_URL
    ? String(import.meta.env.VITE_EDUHUB_API_BASE_URL).trim()
    : "";

export const EDUHUB_API_BASE_URL =
  fromEnv !== ""
    ? fromEnv.replace(/\/+$/, "")
    : typeof import.meta !== "undefined" && import.meta.env.DEV
      ? ""
      : "https://svc-c6848ae1-kl-caa1669c-caa1669c.kubeletto.app";

export const EDUHUB_API_PREFIX = "/api/v1";
