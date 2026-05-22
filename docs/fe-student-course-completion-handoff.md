# FE handoff — Student class completion & reviews

Last updated: 2026-05-19

## Overview

When a student’s **class schedule is finished** (all sessions past per calendar + attendance, or cohort `classEndDate` in the past), the FE redirects them **once** to a congratulations page where they can rate the instructor and Edu Hub.

Until backend endpoints exist, completion detection and reviews are **frontend-only** (schedule helpers + `localStorage`).

## Completion trigger (v1 — schedule-based)

| Signal | Source |
|--------|--------|
| All sessions finished | [`isCourseScheduleFinished`](../src/features/courses/courseScheduleCompletion.ts) — uses `resolveJoinFromMeeting` + held/active slot keys from [`heldScheduleMeetingsStorage`](../src/features/teacher/attendance/heldScheduleMeetingsStorage.ts) |
| Fallback | Past `classEndDate` (end of calendar day) when no slots or sessions still “open” on calendar |

**Not used in v1:** lesson progress 100%, enrollment `COMPLETED` status (no student-facing completion API on [`EnrollmentResponse`](../src/api/eduhubTypes.ts) today).

### Redirect behavior

- [`StudentCourseDetail`](../src/pages/StudentCourseDetail.tsx): enrolled (`scheduleMonthAccess === "full"`) + finished + not seen → `Navigate` to `/dashboard/courses/:courseId/congrats` with `replace`.
- Seen flag: `eduhub_course_congrats_seen__{courseId}__{email}` in `localStorage` ([`courseCongratsSeenStorage.ts`](../src/features/student/courseCongratsSeenStorage.ts)), set when congrats page mounts.

## Reviews (v1 — localStorage)

**Certificate download:** After the instructor publishes a certificate, the student must submit **both** instructor and platform reviews (`hasSubmittedBothReviews`) before the **Download** button is enabled on [`StudentCertificates`](../src/pages/StudentCertificates.tsx). Publishing the certificate is still instructor-only; reviews do not block issuance.

Per student email + course:

| Target | Storage field |
|--------|----------------|
| `INSTRUCTOR` | `instructor` — `rating` (1–5), optional `comment`, `submittedAt` |
| `PLATFORM` | `platform` — same shape |

Key prefix: `eduhub_course_reviews__` — see [`courseReviewsStorage.ts`](../src/features/student/courseReviewsStorage.ts).

Admin certifications UI may later treat “survey completion” as eligibility; replace local store with API when available.

## Proposed backend endpoints

### `GET /courses/:courseId/completion-status`

Student-scoped (enrolled / approved only).

**Response (example):**

```json
{
  "scheduleFinished": true,
  "classEndDate": "2026-05-15",
  "allSessionsFinished": true,
  "enrollmentStatus": "ACTIVE",
  "congratsShownAt": null
}
```

- `scheduleFinished` — authoritative when BE owns schedule + attendance.
- `congratsShownAt` — optional server flag to replace local “seen” storage.

### `POST /courses/:courseId/reviews`

**Body:**

```json
{
  "target": "INSTRUCTOR",
  "rating": 5,
  "comment": "Great class."
}
```

`target`: `INSTRUCTOR` | `PLATFORM`

**Response:** created review id + timestamps.

**Rules:**

- One review per target per enrollment (upsert or 409).
- Only when `scheduleFinished` or enrollment `COMPLETED`.

### Optional: `PATCH /enrollments/me` or webhook

Set enrollment `status` to `COMPLETED` when schedule ends — **separate** from congrats redirect timing; can unlock certificate issuance without changing FE redirect logic.

## Certificates (demo — localStorage + PDF)

After instructor saves final scores on the class **Grades** tab, **Publish certificate** issues a demo credential keyed by course + student. The app fills the official template at `public/certificate-template.pdf` with student name, course title, exam score %, instructor name, and issue date, then downloads the PDF (single publish) or lets students/teachers download from **Certificates** / Grades.

Proposed API: `POST /courses/:courseId/certificates` body `{ studentId }` → stored PDF URL + `certificateNumber` (replace client-side `pdf-lib` fill).

| Module | Role |
|--------|------|
| [`courseCertificatesStorage.ts`](../src/features/courses/courseCertificatesStorage.ts) | Issue/list published certificates |
| [`courseCertificatePdf.ts`](../src/features/courses/courseCertificatePdf.ts) | Fill template PDF (`pdf-lib`) |
| [`TeacherCourseGradesPanel.tsx`](../src/features/teacher/components/TeacherCourseGradesPanel.tsx) | Save grades + publish certificate; **Feedback** column shows per-student instructor rating from `getStudentCourseReviewSummary` (listens to `COURSE_REVIEWS_CHANGED`) |
| [`StudentCertificates.tsx`](../src/pages/StudentCertificates.tsx) | Student view + PDF download |

## FE modules

| Module | Role |
|--------|------|
| [`courseScheduleCompletion.ts`](../src/features/courses/courseScheduleCompletion.ts) | `isCourseScheduleFinished`, `isClassEndDatePassed` |
| [`courseCongratsSeenStorage.ts`](../src/features/student/courseCongratsSeenStorage.ts) | One-time congrats seen flag |
| [`courseReviewsStorage.ts`](../src/features/student/courseReviewsStorage.ts) | Instructor + platform ratings |
| [`StudentCourseCompletionPage.tsx`](../src/pages/StudentCourseCompletionPage.tsx) | Congrats UI + review forms |
| [`AppRoutes.tsx`](../src/app/AppRoutes.tsx) | Route `/dashboard/courses/:courseId/congrats` |

## Test plan (manual)

1. Enrolled class, all sessions in the past → open course detail → redirects to congrats once.
2. Reopen course detail → stays on detail (seen flag set).
3. Class with a future session → no redirect.
4. Past `classEndDate` only (no slots) → redirect.
5. Submit instructor + platform ratings → persisted; submitted state on revisit.
