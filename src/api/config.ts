/**
 * EduHub Platform API — staging base URL.
 * Swagger: https://eduhub-platform-api-staging.kubeletto.app/swagger-ui/index.html
 * Auth: login (POST /auth/login), me (GET /auth/me), refresh (POST /auth/refresh).
 * Verify request/response shapes in Swagger when the API is available.
 */
export const EDUHUB_API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_EDUHUB_API_BASE_URL
    ? String(import.meta.env.VITE_EDUHUB_API_BASE_URL)
    : "https://eduhub-platform-api-staging.kubeletto.app";

export const EDUHUB_API_PREFIX = "/api/v1";
