# EduHub Platform — Progress Report

**Document purpose:** Client-facing summary of delivered features and current state.  
**Last updated:** March 2026.

---

## 1. Project overview

EduHub is a learning management platform with three main user roles: **Student**, **Teacher**, and **Admin**. The frontend is a single-page application (SPA) that provides role-based dashboards, course discovery, enrollment, lessons, quizzes, and administrative surfaces. The app integrates with a backend API for auth, courses, modules, lessons, enrollment, and progress.

---

## 2. Tech stack

| Area | Technology |
|------|------------|
| Framework | React 18, TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Data / API | TanStack Query (React Query), REST client with token refresh |
| UI | Tailwind CSS, Radix UI primitives, Lucide icons, shadcn-style components |
| Forms | React Hook Form, Zod |
| Testing | Vitest, Testing Library |
| Other | Recharts, date-fns, GSAP (landing), PDF.js (lessons), Sonner toasts |

---

## 3. Delivered features

### 3.1 Public & authentication

- **Landing page (EduHub home)**  
  Marketing-style landing with hero, features, testimonials, CTA; GSAP animations.

- **Sign in**  
  Login form wired to backend auth API; stores access/refresh tokens; supports token refresh before expiry.

- **Sign up**  
  Registration flow integrated with backend.

- **Email verification**  
  Verify-email page and route (`/verify-email`, `/verifyemail`) for post-registration verification.

- **Session & role**  
  Central auth context: current user (id, name, email, role). Role mapped from API (e.g. `LECTURER` → teacher, `ADMIN` → admin). Dashboard redirect by role after login.

---

### 3.2 Student experience

- **Dashboard**  
  Welcome message, stats (e.g. courses, assignments), enrolled courses with progress, upcoming assignments, recent activity, notifications dropdown. Data from `useStudentOverviewQuery` (API + fallbacks).

- **My Courses**  
  List of enrolled courses with progress and quick actions (feature module: `StudentCoursesPage`).

- **Available Courses**  
  Catalog combining: (1) published courses from API, (2) my-courses from API, (3) local teacher-created courses for demo. Search, enroll action, pricing display.

- **Course detail**  
  Single course view: description, modules/lessons list, progress, enroll/resume. Supports both API courses (by ID) and local teacher courses (`teacher_${id}`).

- **Lesson page**  
  Lesson content view (e.g. PDF/video/text), progress tracking, navigation to next/previous lesson. Uses API modules/lessons and local progress where applicable.

- **Assignments**  
  Assignments list and status (placement/test-related).

- **Quiz**  
  Student quiz/placement test flow.

- **Certificates**  
  Certificates view.

- **Progress**  
  Student progress overview.

- **Schedule**  
  Schedule view.

- **Notifications**  
  Notifications list and unread indicator (e.g. in dashboard header).

- **Settings**  
  Student settings page.

---

### 3.3 Teacher experience

- **Dashboard**  
  Teacher home (placeholder or summary).

- **My courses**  
  List of teacher-created courses; create, edit, delete, publish; integrates with backend (e.g. GET/POST/PATCH/DELETE courses) and local store for same-browser demo.

- **Add / Edit course**  
  Course form: title, description, lessons/modules, duration, etc.; create new and edit by `courseId`.

- **Placement test / Quiz**  
  Teacher quiz creation and management (`TeacherQuizPage`).

- **Quiz results**  
  View results per quiz (`TeacherQuizResultsPage`, by `quizId`).

- **Students**  
  List of students (`TeacherStudentsPage`).

- **Schedule, Settings**  
  Routes present; currently placeholder pages.

---

### 3.4 Admin experience

- **Dashboard**  
  Admin home: stats (e.g. users, courses, revenue), recent users, system activity, quick actions. Data from `useAdminOverviewQuery`.

- **Other admin sections**  
  Routes and sidebar entries exist for: All Students, All Teachers, All Staff, All Courses, Add User Role, Transactions, Reports, Users, Analytics, Settings. These currently render a shared **placeholder** (“Coming soon” / under construction) until backend and UI are implemented.

---

## 4. Architecture & infrastructure

- **Feature-first structure**  
  Features grouped under `src/features/` (e.g. `auth`, `layout`, `student`, `admin`, `teacher`) with pages, components, data, and hooks per domain.

- **Central app shell**  
  `App.tsx` composes providers and route tree. `AppRoutes.tsx` declares all routes; `routes.ts` holds route constants and role-based dashboard home.

- **Providers**  
  Single provider stack in `providers.tsx`: React Query, auth session, layout state, toasts.

- **Auth state**  
  Auth context provides user and role; token storage and refresh handled in `eduhubClient`; no per-page polling for session.

- **Layout**  
  Collapsible sidebar with role-based menu items from `navigation.ts`; sidebar state in layout context and `useSidebarState` (including localStorage sync).

- **API layer**  
  `eduhubClient`: auth (login, refresh), courses (list, get, create, update, publish, delete), modules, lessons, enrollment, lesson progress. Typed with `eduhubTypes`; base URL and prefix from `config`.

- **Data fetching**  
  TanStack Query used in feature hooks (e.g. `useStudentQueries`, `useAdminQueries`); course catalog uses API + local teacher store so students see published API courses and local demo courses.

---

## 5. Testing & quality

- **Test setup**  
  Vitest, Testing Library, global setup and render helpers with providers.

- **Covered areas**  
  Route behavior (e.g. `AppRoutes`: sign-in, dashboard redirect, 404), sidebar state hook (`useSidebarState`), navigation config, student and admin dashboard page presence.

- **Quality gates**  
  Lint and TypeScript build used to catch regressions.

---

## 6. Upcoming task list (undone)

Tasks below are not yet implemented or are placeholder. Use this list to plan sprints and report progress.

### Admin (all currently placeholder)

- [ ] **All Students** — List, search, filter, and manage students (`/dashboard/admin/students`).
- [ ] **All Teachers** — List and manage teachers (`/dashboard/admin/teachers`).
- [ ] **All Staff** — List and manage staff (`/dashboard/admin/staff`).
- [ ] **All Courses** — Admin view of all platform courses; approve/unpublish if needed (`/dashboard/admin/courses`).
- [ ] **Add User Role** — Assign or change user roles (`/dashboard/admin/add-user-role`).
- [ ] **Transactions** — View payments/transactions (`/dashboard/admin/transactions`).
- [ ] **Reports** — Reports and exports (`/dashboard/admin/reports`).
- [ ] **Users** — User management (list, edit, disable) (`/dashboard/admin/users`).
- [ ] **Analytics** — Analytics dashboard and metrics (`/dashboard/admin/analytics`).
- [ ] **Admin Settings** — Platform or admin-specific settings (`/dashboard/admin/settings`).

### Teacher

- [ ] **Teacher Dashboard** — Replace placeholder with real summary (stats, recent activity, quick links).
- [ ] **Teacher Assignments** — Assignments management page (`/dashboard/teacher/assignments`).
- [ ] **Teacher Schedule** — Schedule/calendar view (`/dashboard/teacher/schedule`).
- [ ] **Teacher Settings** — Profile or teaching preferences (`/dashboard/teacher/settings`).

### Student (enhancements / optional)

- [ ] **Assignments** — Full backend integration if assignment APIs are available.
- [ ] **Certificates** — Backend integration for issuing and displaying certificates.
- [ ] **Progress** — Align fully with backend progress APIs if needed.
- [ ] **Schedule** — Backend-driven schedule if applicable.

### API & backend alignment

- [ ] Ensure **GET /api/v1/courses** returns all published courses for student catalog.
- [ ] Ensure lecturers can **publish** courses (e.g. PATCH `/api/v1/courses/{id}/publish`).
- [ ] Define and implement APIs for admin areas (users, transactions, reports, analytics) when product is ready.
- [ ] Add or align APIs for teacher assignments and schedule if required.

### Technical & quality

- [ ] Add tests for new feature pages as they are built (e.g. admin and teacher placeholders when replaced).
- [ ] Migrate remaining legacy pages from `src/pages/*` into `src/features/*` where it adds clarity.
- [ ] Document or standardize error handling and empty states across dashboards.
- [ ] Add E2E tests (e.g. Playwright/Cypress) for critical flows (login, course enroll, lesson view).
- [ ] Accessibility (a11y) audit and fixes (keyboard nav, ARIA, focus order).
- [ ] Mobile responsiveness review and tweaks for dashboard and course pages.

### Auth & account

- [ ] **Forgot password** — Request reset link and reset-password flow (if not yet in backend).
- [ ] **Password change** — Change password from Settings (student/teacher/admin).
- [ ] **Profile edit** — Edit name, email, or avatar from Settings/dashboard.

### Other / backlog

- [ ] Notifications: backend integration for real or push notifications (if required).
- [ ] Search: global or course-level search (if in scope).
- [ ] Localization (i18n) or multi-language support (if required).
- [ ] Deployment and environment docs (staging vs production, env vars).

---

## 7. Summary for client

| Area | Status |
|------|--------|
| **Public site & auth** | Done: landing, sign-in, sign-up, verify-email, session, role-based redirect |
| **Student flows** | Done: dashboard, my courses, available courses, course detail, lessons, assignments, quiz, certificates, progress, schedule, notifications, settings |
| **Teacher flows** | Done: dashboard, course CRUD + publish, add/edit course form, placement test/quiz, quiz results, students list; schedule/settings are placeholders |
| **Admin** | Done: admin dashboard with stats and activity; other admin pages are placeholders |
| **API integration** | Done: auth, courses (published catalog + my-courses), modules, lessons, enrollment, lesson progress; token refresh in place |
| **Architecture** | Done: feature-first layout, central routes and providers, shared auth and layout state |

**Placeholder / next steps:**  
See **§6. Upcoming task list** for a full list of undone items (admin sub-pages, teacher dashboard/schedule/settings/assignments, and API/quality tasks).

---

*This report reflects the current codebase and can be updated as new features are completed.*
