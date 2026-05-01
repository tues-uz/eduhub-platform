# Admin area — status (client report)

Short summary of what the admin UI **already gives you** vs what still needs **backend / product work**.

Per-screen behavior: **`docs/admin-flows.md`**. Checklist mirror: **`docs/client-tasks.md`**.

---

## What’s done

### Navigation & shell

- Full admin sidebar menu; every listed route has a page; consistent layout and **Back to dashboard** on inner pages.
- Quick Actions on the dashboard link to common admin destinations.

### Dashboard (`/dashboard/admin`)

- Stat cards when the API responds.
- **Recent users** table with search and filters.
- **Quick Actions** grid and **System activity** readout.
- Row **⋯** menu present (options are placeholders — see not done).

### People

- **Students** — Directory with status, trial, course count, flags; filters; search; row menu (enrollments link, profile demo).
- **Teachers** — List with filters; **View profile** panel with **Courses taught** and enrolled/capacity; **View details** jumps to All courses with search prefilled / highlight when IDs match API.
- **Staff** — Read-only list with role/status filters and search.
- **Users** — Cross-role list with role/status filters and search (currently demo data in table).
- **Add user role** — Create-user form (name, email, phone, role); **`eduhubAdmin.createUser`** on submit; success toast and redirect to dashboard (align copy with backend default-password / onboarding policy).

### Courses & classes

- **All courses** — API-backed list (including draft merge when API supports `status=DRAFT`); search; status/category filters; optional `?q=` / `?courseId=` URL hints.
- **Review & publish** — Dialog with catalog price (UZS), referral code, discount %, live discounted price preview; **Publish** calls API; pricing metadata held in **sessionStorage** until billing API exists.
- **View** on published course — reopen dialog to adjust recorded price (same browser storage story).
- Teacher flow alignment in UI — teachers **cannot** set catalog price; drafts show pending admin approval.
- **Enrollments & waitlist** — Table with payment/enrollment/class filters, search, waitlist position; select waitlist rows + **Promote** button (demo only).
- **Classes & rosters** — Sections with schedule, capacity, session quota, status filters; **Open roster** control (demo only).

### Operations

- **Payments** — Invoice-style rows; filters; search; **Remind selected** (demo); **View details** panel; proof open + **Approve proof** (demo); **Mark paid** two-step dialog with **in-session** row update until refresh.
- **Transactions** — Ledger-style table with type/method filters and search (demo data).
- **Attendance** — Table with at-risk filters, lecturer filter, search; **View details** panel with session breakdown.
- **Placement tests** — Results table with filters (demo data).
- **Certifications** — Eligibility-style table; **Issue certificate** for eligible rows (demo toast).
- **Calendar** — Event list with type filter and search (demo list, not a full grid).
- **Support sessions** — Requested/scheduled flows with **Approve & schedule** / **View slot** (demo).

### System

- **Integrations** — LMS base URL display + open in new tab; trial policy copy.
- **Reports** — Placeholder KPI layout (numbers are demo).
- **Settings** — Feature switches + **Save changes** UI (demo persistence).

---

## What’s not done yet (typical next steps)

### Data & APIs

- Replace **mock operational data** (`adminOperationalMock` and similar) with real endpoints for transactions, attendance source of truth, placement, certifications list, calendar events, support sessions, staff/users where still demo.
- Dashboard **Recent users** and stats — harden error/empty states when API is down or partial.

### Persistence (server or durable client)

- **Catalog price, referral code, discount** — persist on server after publish (today: **sessionStorage** / `adminCourseCatalog`).
- **Mark paid** — persist via payments API; today survives only until refresh against mock rows.
- **Settings** — save to server; **Reports** — real metrics and time ranges.

### Demo actions → real workflows

- **Remind selected** (students, payments) — send email or queue job.
- **Waitlist promote** — server enrollment state + notifications.
- **Certificate issue** — generate/store credential.
- **Support approve & schedule** — write slot + notify student.
- **Proof approve** — persist approval + unlock payment state if applicable.
- **Open roster** — dedicated roster view or deep link to class roster API.
- **Students → View profile** — real profile page or drawer data from API.

### Navigation & polish

- **Dashboard Recent Users → Add User** — wire to **Add user role** (or user creation) route; today use sidebar per `admin-flows.md`.
- **Dashboard row ⋯** — implement real actions (open user, impersonation policy, etc.).
- **Enrollments** — honor **`?student=`** from Students → View enrollments (auto-filter table).
- **Exports** — CSV/PDF from reports, payments, enrollments as product requires.
- **Audit logs** — admin action history page + API.
- **Access control** — enforce **admin-only** on all `/dashboard/admin/*` routes and API calls end-to-end (UI + token claims).

### UX / product (optional later)

- Full **calendar grid** (month/week) instead of list-only.
- **Reports** — drill-downs, scheduled delivery, role-scoped templates.

---

## One-line takeaway

**The admin area is navigable and feature-complete as a UI prototype; production rollout means wiring APIs, persistence, and turning demo actions into real server workflows.**
