# Admin area — delivery status (client report)

This document summarizes **what is implemented** in the EduHub admin experience versus **what remains** for a full production rollout. It is intended for stakeholder and client reporting. Last aligned with the codebase structure under `src/features/admin/` and related routes.

---

## Summary

| Category | Status |
| -------- | ------ |
| **Navigation & shell** | Done — nested sidebar, routes, layout, back links |
| **Screen coverage** | Done — all planned admin sections have a page |
| **Live API integration** | **Partial** — dashboard overview and course catalog/publish connect to the backend; most operational tables use **mock data** or **browser-only storage** |
| **End-to-end business workflows** | **Partial** — UX and demos exist; many actions need backend contracts and persistence |

---

## Done (delivered in the product UI)

### Shell and navigation

- **Admin layout** with shared header patterns and **“Back to dashboard”** on inner pages.
- **Nested sidebar** (Dashboard, People, Courses & classes, Operations, Integrations, Reports, Settings).
- **Routes** wired for all admin URLs under `/dashboard/admin/…`.

### Dashboard (`/dashboard/admin`)

- Stat cards and **Recent Users** table with **search + role + status** filters.
- **Quick Actions** linking to key admin areas.
- **System activity** list (content driven by API when available).
- Uses **`useAdminOverviewQuery`** / dashboard API when the backend responds.

### People

- **Students** — directory table, filters, selection, **Remind selected** (demo feedback). Row menu: link toward enrollments (URL param), **View profile** (demo). Flags such as **Unpaid · attending** where modeled in mock data.
- **Teachers** — filters (status, course load), **View profile** dialog with course list, **enrolled/capacity** as chips, **View details** deep link to **All courses** with query params.
- **Staff** and **Users** — searchable, filterable tables (mock data).
- **Add user role** — form UI (submit shows demo success; no live invite API in this flow).

### Courses & classes

- **All courses** — loads from **`eduhubCourses` API** (merged list attempts to include **drafts** when `GET /courses?status=DRAFT` is supported). Filters, highlight from URL (`q`, `courseId`).
- **Teacher → admin publishing workflow** — teachers save courses as **draft** without setting price; **Publish** is an **admin** action via **Review & publish** dialog.
- **Admin catalog fields (local until API)** — **catalog price**, **referral code**, **discount %**, live **discounted price** preview, **Publish course** / **Save catalog**; table columns including **Discounted price** (calculated).
- **Enrollments & waitlist** — table with filters; **Promote selected from waitlist** (demo).
- **Classes & rosters** — table with capacity/session quota display; **Open roster** (demo).

### Operations

- **Payments** — filters, row selection, **Remind selected** (demo), **View details** and **proof** dialogs, **Mark paid** with confirmation; **paid** state updates **in session** until refresh (until payments API replaces mock).
- **Transactions** — filterable ledger table (mock).
- **Attendance** — filters, **View details** dialog with session log (mock).
- **Placement tests** — filterable results table (mock).
- **Certifications** — eligibility display, **Issue certificate** (demo).
- **Calendar** — filterable event list (mock).
- **Support sessions** — **Approve & schedule** / **View slot** (demo).

### System

- **Integrations** — LMS URL display and external link; trial policy copy.
- **Reports** — placeholder KPI cards (demo numbers).
- **Settings** — toggles with **Save** (demo).

### Teacher alignment (related to admin policy)

- **Teacher course form** — **no teacher-set price**; copy explains **admin-only pricing and publish**.

### Documentation

- **`docs/admin-flows.md`** — user-oriented flow guide for the admin area.

---

## Partially done (UI ready, integration incomplete)

| Item | What exists | What is missing |
| ---- | ----------- | ----------------- |
| **Dashboard stats / recent users / activity** | API hook and UI | Depends on stable **admin overview** backend; may be empty or static if API fails |
| **All courses — draft visibility** | Merges default `getAll` + `status=DRAFT` | Backend must return drafts for admins (or a dedicated admin list endpoint) |
| **Catalog price, referral, discount** | Full UI + `sessionStorage` | **Persist on server** (course or promotions service); checkout/enrollment must **read** the same rules |
| **Mark paid** | Session state update + toasts | **PATCH payment** + source of truth in DB |
| **Students → View enrollments** | Navigates with `?student=` | **Enrollments page** does not yet apply that query param to filter rows |
| **Add User** (dashboard header) | Button present | **Not linked** to Add user role route (use sidebar) |

---

## Not done / backlog (typical next phase)

### Data and APIs

- Replace **`adminOperationalMock`** with real endpoints for: students, staff, users, enrollments, classes, payments, transactions, attendance, placement, certifications, calendar, support.
- **Referral and discount** rules on the **server** (validation, audit, fraud limits).
- **Roster** screen or modal (currently **Open roster** is demo-only).
- **Reports** — real KPIs, date ranges, exports (CSV/PDF).
- **Settings** — persist toggles via **admin settings API**.

### Actions currently demo-only (need APIs)

- Payment reminders, waitlist promotion, certificate issue, support approval, bulk emails, proof approval persistence.
- Dashboard row actions (**View / Edit / Deactivate**) for recent users without navigation.
- **Add user role** — real invite or role-assignment API.

### Hardening and product polish

- Role-based access (**ADMIN** only) enforced on every route and API call (frontend + backend).
- Empty and error states when APIs are down (partially present on courses).
- Audit logs for approve/publish, price changes, and payment marks.

---

## How to read this for clients

- **“Done”** = users can navigate, see representative data, and complete **defined** interactions in the UI; some of those interactions are **prototypes** (toast/demo/local storage) rather than database-backed.
- **“Undone”** = requires **backend design and implementation**, not only frontend work.

For questions about a specific screen, see **`docs/admin-flows.md`** for behavior detail, or the corresponding file under `src/features/admin/pages/`.
