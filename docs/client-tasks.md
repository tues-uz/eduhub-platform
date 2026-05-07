# Client (admin UI) — done vs not done

Admin-area scope. Narrative version: [`admin-client-status-report.md`](./admin-client-status-report.md). Per-screen copy: [`admin-flows.md`](./admin-flows.md).

---

## Done

### Navigation & shell

- [x] Full admin sidebar; every menu route has a page; consistent layout.
- [x] **Back to dashboard** on inner admin pages.
- [x] Dashboard **Quick Actions** deep links.

### Dashboard

- [x] Stat cards (when API responds).
- [x] Recent users — search, filters, table.
- [x] System activity / quick links blocks as implemented.
- [x] Row ⋯ menu UI (actions still placeholders — see Not done).

### People

- [x] Students — filters, search, row actions (enrollments link; profile demo).
- [x] Teachers — profile drawer, courses taught, jump to All courses with context.
- [x] Staff — read-only table, filters, search.
- [x] Users — table, filters, search (table data may be demo).
- [x] Add user role — `eduhubAdmin.createUser`; success redirect to dashboard.

### Courses & classes

- [x] All courses — API list + drafts when supported; filters; URL `?q=` / `?courseId=`.
- [x] Review & publish dialog — price, referral, discount %, discounted preview; API publish.
- [x] Session/browser storage for catalog fields until billing API.
- [x] Teacher cannot set catalog price in UI.
- [x] Enrollments — filters, waitlist UI, promote button (demo).
- [x] Classes — roster button UI (demo).

### Operations

- [x] Payments — detail panel, remind (demo), proof flow (demo), mark paid in-session.
- [x] Transactions — read-only ledger UI (demo data).
- [x] Attendance — table + detail panel.
- [x] Placement tests — table (demo data).
- [x] Certifications — issue action (demo).
- [x] Calendar — list view (demo).
- [x] Support sessions — approve / view slot (demo).

### System

- [x] Integrations — LMS URL + open tab.
- [x] Reports — placeholder KPI layout.
- [x] Settings — toggles + save UI (demo).

---

## Not done

### Data & APIs

- [ ] Wire operational tables to real APIs (transactions, attendance, placement, certs, calendar, support, staff/users where demo).
- [ ] Harden dashboard stats / recent users for API failure and empty states.

### Persistence

- [ ] Server persistence for catalog price, referral code, discount after publish.
- [ ] Server **mark paid** and payment state sync.
- [ ] Server **settings** save; real **reports** metrics.

### Demo → production

- [ ] Email / job queue for **Remind** (students, payments).
- [ ] **Waitlist promote** server update + notifications.
- [ ] **Certificate issue** generation/storage.
- [ ] **Support** approve & schedule persistence.
- [ ] **Proof approve** persistence.
- [ ] **Roster** — real screen or API-backed view.
- [ ] **Student profile** from API (replace profile demo).

### Polish & access

- [ ] Wire dashboard **Add User** to add-user-role (or create user).
- [ ] Implement dashboard row ⋯ real actions.
- [ ] Enrollments auto-filter from **`?student=`** query.
- [ ] Exports (CSV/PDF) where required.
- [ ] Admin **audit log** UI + API.
- [ ] Strict **admin-only** routes and API usage.

### Optional / later

- [ ] Calendar month/week grid.
- [ ] Reports drill-downs and scheduling.

---

## Takeaway

Admin UI is a **full prototype**; ship means **APIs**, **persistence**, and replacing **demo** paths with real workflows.
