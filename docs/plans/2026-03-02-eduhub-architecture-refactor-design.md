# EduHub Architecture Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor `eduhub-platform` to follow `cms-all-platform` best practices by introducing feature-first structure, centralized route/provider composition, reusable role/auth state, and modular dashboard pages that are easier to scale and maintain.

**Architecture:** Move from page-centric monolith components to a feature-centric layout (`features/auth`, `features/dashboard`, `features/student`, `features/admin`, `features/teacher`). Introduce shared route declarations and layout wrappers, then migrate Student/Admin flows to smaller presentation components + hooks while preserving UI behavior. Add focused tests for routes, auth context, and extracted logic to prevent regressions.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, TanStack Query, Testing Library + Vitest.

---

### Task 1: Add test tooling baseline for refactor safety

**Files:**
- Modify: `package.json`
- Create: `src/test/setup.ts`
- Create: `src/test/utils.tsx`
- Create: `vite.config.ts` (if test config missing, update existing)

**Step 1: Write the failing test**

Create a minimal smoke test in Task 2 that imports `src/test/utils.tsx` before implementation.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/AppRoutes.test.tsx`
Expected: FAIL with missing Vitest config/setup utilities.

**Step 3: Write minimal implementation**

Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and test scripts. Add setup file and render helper with providers.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/AppRoutes.test.tsx`
Expected: test runner starts and executes tests.

**Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/test/utils.tsx
git commit -m "test: add vitest baseline for safe architecture refactor"
```

### Task 2: Extract app providers and route composition

**Files:**
- Create: `src/app/providers.tsx`
- Create: `src/app/AppRoutes.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/app/AppRoutes.test.tsx`

**Step 1: Write the failing test**

Add tests asserting:
- wildcard route renders NotFound
- `/signin` renders sign-in page
- `/dashboard` resolves via role redirect behavior

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/AppRoutes.test.tsx`
Expected: FAIL because `AppRoutes` and provider composition do not exist.

**Step 3: Write minimal implementation**

Create `AppRoutes` for all route declarations and keep `App` as a lightweight shell. Move QueryClient + toaster wrappers into `providers.tsx`. Keep existing visual behavior.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/AppRoutes.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/providers.tsx src/app/AppRoutes.tsx src/App.tsx src/main.tsx src/app/AppRoutes.test.tsx
git commit -m "refactor: split app providers and route composition"
```

### Task 3: Centralize auth/session and sidebar preference state

**Files:**
- Create: `src/features/auth/context.tsx`
- Create: `src/features/auth/types.ts`
- Create: `src/features/layout/context.tsx`
- Create: `src/features/layout/hooks/useSidebarState.ts`
- Modify: `src/components/DashboardSidebar.tsx`
- Modify: `src/pages/StudentDashboard.tsx`
- Modify: `src/pages/StudentCourses.tsx`
- Modify: `src/pages/AdminDashboard.tsx`
- Test: `src/features/layout/hooks/useSidebarState.test.tsx`

**Step 1: Write the failing test**

Add tests for `useSidebarState`:
- defaults false when storage empty
- updates localStorage on toggle
- synchronizes on `storage` event

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/layout/hooks/useSidebarState.test.tsx`
Expected: FAIL because hook/context do not exist.

**Step 3: Write minimal implementation**

Implement role + profile context wrappers (backed by current localStorage for now) and reusable sidebar hook. Replace interval polling with state/context subscription.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/layout/hooks/useSidebarState.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/auth/context.tsx src/features/auth/types.ts src/features/layout/context.tsx src/features/layout/hooks/useSidebarState.ts src/features/layout/hooks/useSidebarState.test.tsx src/components/DashboardSidebar.tsx src/pages/StudentDashboard.tsx src/pages/StudentCourses.tsx src/pages/AdminDashboard.tsx
git commit -m "refactor: centralize auth and sidebar state"
```

### Task 4: Introduce feature-first dashboard modules (Student + Admin)

**Files:**
- Create: `src/features/student/pages/StudentDashboardPage.tsx`
- Create: `src/features/student/pages/StudentCoursesPage.tsx`
- Create: `src/features/student/components/*` (cards/sections extracted)
- Create: `src/features/student/data/mockStudentData.ts`
- Create: `src/features/admin/pages/AdminDashboardPage.tsx`
- Create: `src/features/admin/components/*`
- Create: `src/features/admin/data/mockAdminData.ts`
- Modify: `src/app/AppRoutes.tsx`
- Modify: `src/pages/StudentDashboard.tsx` (adapter or re-export)
- Modify: `src/pages/StudentCourses.tsx` (adapter or re-export)
- Modify: `src/pages/AdminDashboard.tsx` (adapter or re-export)
- Test: `src/features/student/pages/StudentDashboardPage.test.tsx`
- Test: `src/features/admin/pages/AdminDashboardPage.test.tsx`

**Step 1: Write the failing test**

Add page tests asserting key sections render:
- Student dashboard: stats + assignments + notifications action
- Admin dashboard: stats + recent users + quick actions

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/student/pages/StudentDashboardPage.test.tsx src/features/admin/pages/AdminDashboardPage.test.tsx`
Expected: FAIL because new feature pages not created.

**Step 3: Write minimal implementation**

Extract constants/data from monolithic pages, split into focused subcomponents, keep output unchanged. Keep old page files as shallow wrappers to avoid route breakage while migrating.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/student/pages/StudentDashboardPage.test.tsx src/features/admin/pages/AdminDashboardPage.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/student src/features/admin src/app/AppRoutes.tsx src/pages/StudentDashboard.tsx src/pages/StudentCourses.tsx src/pages/AdminDashboard.tsx
git commit -m "refactor: migrate student and admin dashboards to feature modules"
```

### Task 5: Normalize navigation definitions and route constants

**Files:**
- Create: `src/features/layout/navigation.ts`
- Create: `src/app/routes.ts`
- Modify: `src/components/DashboardSidebar.tsx`
- Modify: `src/pages/DashboardRedirect.tsx`
- Test: `src/features/layout/navigation.test.ts`

**Step 1: Write the failing test**

Add tests for role-based menu visibility and route map correctness.

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/layout/navigation.test.ts`
Expected: FAIL because nav configuration module does not exist.

**Step 3: Write minimal implementation**

Move hardcoded menu arrays and role-based home paths into dedicated config files. Sidebar becomes presentational + selection logic only.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/layout/navigation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/layout/navigation.ts src/app/routes.ts src/components/DashboardSidebar.tsx src/pages/DashboardRedirect.tsx src/features/layout/navigation.test.ts
git commit -m "refactor: centralize route and navigation configuration"
```

### Task 6: Verification and cleanup

**Files:**
- Modify: `README.md` (if present) or create `docs/architecture/eduhub-structure.md`
- Modify: touched files for lint fixes

**Step 1: Write the failing test**

Use lint/type/build as quality gates (no new functional tests required).

**Step 2: Run test to verify it fails**

Run: `npm run lint && npm run build`
Expected: Any issue is captured before finalizing.

**Step 3: Write minimal implementation**

Address lint/types, remove dead imports/wrappers, document new structure and migration notes.

**Step 4: Run test to verify it passes**

Run: `npm run lint && npm run build && npm run test`
Expected: all commands pass.

**Step 5: Commit**

```bash
git add .
git commit -m "chore: finalize eduhub architecture refactor and documentation"
```
