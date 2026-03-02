# EduHub Frontend Structure

## Core app composition

- `src/main.tsx`: app bootstrap with `BrowserRouter`, `ErrorBoundary`, `StrictMode`.
- `src/App.tsx`: lightweight shell that composes providers and route tree.
- `src/app/providers.tsx`: central provider stack (React Query, auth session, layout state, toasts).
- `src/app/AppRoutes.tsx`: route declarations.
- `src/app/routes.ts`: route constants and role-to-dashboard mapping.

## Feature-first modules

- `src/features/auth/*`: session context and user role types.
- `src/features/layout/*`: sidebar state hook, layout context, and role navigation config.
- `src/features/student/pages/*`: student route entrypoints.
- `src/features/admin/pages/*`: admin route entrypoints.

## Testing baseline

- `vitest.config.ts`: test runner config.
- `src/test/setup.ts`: global test setup and browser polyfills.
- `src/test/utils.tsx`: shared render helper with providers.
- Route and architecture tests live close to features (`src/app`, `src/features/*`).

## Migration notes

- Legacy page files in `src/pages/*` are still used, but app routing now resolves through feature entrypoints.
- Sidebar and session state no longer rely on per-page `setInterval` polling.
- New work should be added under `src/features/<domain>` first, then wired into `src/app/AppRoutes.tsx`.
