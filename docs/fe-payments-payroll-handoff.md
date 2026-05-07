# FE handoff — Payments & Payroll (for BE)

Last updated: 2026-05-07

This document summarizes what is already implemented on the **frontend** (currently demo-backed with `localStorage`), and what the backend should provide next to make it production-ready.

## 1) Payments — Admin

### 1.1 Admin Payments page
- **Route**: `/dashboard/admin/payments`
- **File**: `src/features/admin/pages/AdminPaymentsPage.tsx`
- **Data**: `useAdminPayments()` from `src/features/admin/data/adminPaymentsStore.ts`

### 1.2 Implemented UI features
- **Table + filters**
  - Search includes: student, class, course, lecturer, lecturerEmail, invoice reference, studentEmail, amount.
  - Filters: status (`pending|paid|overdue`) and lecturer name.
- **View details dialog**
  - Student + email
  - Class + course + lecturer
  - Amount + due date + status
  - Reference + method + createdAt + paidAt
  - Proof submitted flag
- **Mark paid flow (form dialog)**
  - Required fields to confirm:
    - `paidAt` (date)
    - `paymentMethod`
    - `reference`
  - Updates the row to `status: "paid"` and sets `paidAt`, `paymentMethod`, `reference` (demo: local store update).
- **Proof dialog (placeholder)**
  - Exists, but file preview/approval is demo-only right now.

### 1.3 Current payment row shape (FE)
- **Type**: `AdminPaymentRow`
- **File**: `src/features/admin/data/adminOperationalMock.ts`
- Key fields used across FE:
  - `id`
  - `className`
  - `course`
  - `studentName`, `studentEmail`
  - `lecturerName`, **`lecturerEmail?`**
  - `amount`, `currency`
  - `dueDate`
  - `status`: `"pending" | "paid" | "overdue"`
  - `reference`
  - `paymentMethod`
  - `createdAt`
  - `paidAt?`
  - `proofSubmitted`

## 2) Payments — Student

### 2.1 Student payment history page
- **Route**: `/dashboard/payment`
- **File**: `src/pages/StudentPaymentInfo.tsx`
- **Data source (demo)**: `enrollmentApplicationStore` (`src/features/enrollment/enrollmentApplicationStore.ts`)

### 2.2 Implemented UI features
- Lists the student’s enrollment payment submissions by `applicantEmailNorm`.
- Search across: class title, status, plan summary, admin note, etc.
- Details dialog includes:
  - Enrollment details + payment plan summary
  - Proof link if URL
  - Admin note
  - Download PDF
- **Upload proof (demo)**:
  - Button appears when status is `PENDING` or `REJECTED` and proof isn’t an HTTP URL.
  - Updates `paymentProofUrl` locally (store now supports patching `paymentProofUrl`).

## 3) Payroll — Instructor monthly submissions (request → admin approval)

### 3.1 Teacher Payroll overview (class cards + submit form)
- **Route**: `/dashboard/teacher/payroll`
- **File**: `src/features/teacher/pages/TeacherPayrollPage.tsx`
- **Cards source**
  - Prefer: aggregates from payment rows (when payment rows exist for this instructor)
  - Fallback: active teacher classes from “My Class” (API or local store)
- **Action**: **Submit payroll** opens a dialog form and creates a payroll request record.

### 3.2 Teacher Payroll submissions history (dedicated page)
- **Route**: `/dashboard/teacher/payroll/submissions`
- **File**: `src/features/teacher/pages/TeacherPayrollSubmissionsPage.tsx`
- Lists all submissions for the instructor (pending/approved/rejected), searchable.

### 3.3 Admin Payroll approval panel
- **Route**: `/dashboard/admin/payroll`
- **File**: `src/features/admin/pages/AdminPayrollPage.tsx`
- Shows pending instructor payroll requests with:
  - Submitted fields (period, sessions, requested payout, payout details, notes, summary)
  - Buttons: **Approve** / **Reject** (reject can include admin note)

### 3.4 Instructor payroll request record shape (FE)
- **Type**: `InstructorPayrollRequestRecord`
- **File**: `src/features/teacher/data/instructorPayrollRequestStore.ts`
- Key fields:
  - `id`, `submittedAt`
  - `classSection`, `course`
  - `instructorName`, `instructorEmailNorm`
  - `periodLabel` (e.g. `Apr 2026`)
  - `sessionsTaught` (freeform)
  - `requestedPayout` (freeform string)
  - `payoutDetails` (freeform string)
  - `summary` (computed snapshot string)
  - `instructorNotes`
  - `status`: `"pending" | "approved" | "rejected"`
  - `resolvedAt?`, `adminNote?`

## 4) Notifications (in-app demo)

### 4.1 Teacher notifications
- **Route**: `/dashboard/teacher/notifications`
- **File**: `src/pages/TeacherNotifications.tsx`
- **Store**: `src/features/notifications/appNotificationStore.ts`

### 4.2 Events currently emitted (demo)
- Instructor submits payroll request → **admin notification** (`admin_instructor_payroll_request`)
- Admin approves/rejects request → **instructor notification**
  - `instructor_payroll_request_approved`
  - `instructor_payroll_request_rejected`
- Admin records payout proof (separate flow) → `instructor_payroll_paid`

> Note: current notifications are `localStorage` demo only. Targeting is by normalized email when possible, with a fallback to instructor display name when email is missing.

## 5) Dashboard alignment (Teacher)

- Teacher dashboard tile **now shows “Collected payments”**
  - **Source**: sum of `AdminPaymentRow` where `status === "paid"` filtered by lecturer (email/name)
  - **File**: `src/pages/TeacherDashboard.tsx`
  - Links to: `/dashboard/teacher/payroll`

## 6) What BE should implement next (API contracts)

### 6.1 Payments API (replace demo store)
Needed so Admin Payments becomes authoritative (and matches teacher/student totals).

Recommended endpoints (shape can vary):
- `GET /payments?status=&lecturerId=&classId=&from=&to=`
- `PATCH /payments/:id`
  - Update: `status`, `paidAt`, `paymentMethod`, `reference`, `proof`, etc.
- (Optional) `POST /payments/:id/remind` (or bulk remind endpoint)

Data requirements:
- Stable IDs for student, lecturer, class/course section
- Currency/amount fields
- Status transitions + audit fields (who changed / when)

### 6.2 Payroll requests API (replace local instructor store)
- `POST /payroll/requests`
- `GET /payroll/requests?instructorId=&status=&period=`
- `POST /payroll/requests/:id/approve`
- `POST /payroll/requests/:id/reject`

Required fields should support:
- periodLabel (or canonical period like `2026-04`)
- sessionsTaught, requestedPayout, payoutDetails, notes
- admin resolution fields: resolvedAt, adminNote, resolverId

### 6.3 Notifications API (replace local notifications)
- Persist notifications server-side; target by **userId** (not email).
- Provide:
  - `GET /notifications?audience=teacher|admin|student`
  - `POST /notifications/:id/read`
  - `POST /notifications/read-all`

## 7) Demo-only localStorage keys (current FE)
- Admin payments: `eduhub.adminPayments.v1`
- Instructor payroll requests: `eduhub.instructorPayrollRequests.v1`
- App notifications: `eduhub_app_notifications_v1`
- Enrollment applications: `eduhub_enrollment_applications_v1`

