# Frontend status — for backend partner

**Branch:** `eduhub-v13`  
**Updated:** 2026-05-20

Short overview of what the frontend already does, what still uses **demo data (`localStorage`)**, and what we need from the API.

---

## Main flows

### 1. Class schedule

1. **Admin** builds the schedule (any number of months → sessions with optional date/time).
2. **Admin** sends plan → `POST /admin/courses/:id/schedule`.
3. **Instructor** approves or rejects → `PATCH /courses/:id/schedule/approve` or `reject`.
4. **Admin** publishes the class.
5. Students can apply.

### 2. Enrollment & payment

1. **Student** applies (pick tuition months, cash or bank transfer + uploads if transfer).
2. **Admin** approves → should return **invoice + receipt numbers** and payment fields.
3. **Student** sees status and can **download PDF** (receipt/invoice) in the app.

### 3. During the class

1. **Instructor** runs **QR attendance**.
2. **Student** sees schedule by month (access depends on enrollment / paid months).
3. **Instructor** can write **class resume** notes (demo storage today).

### 4. End of class

1. When schedule is finished → **student** sees a **congrats** page and can rate instructor + platform (demo storage).
2. **Instructor** saves **grades** (attendance % + instructor score) → **publishes certificate**.
3. **Student** downloads **certificate PDF** from Certificates page.

### 5. Substitute teacher

1. Course lead invites substitute (can pick a **session**).
2. Substitute only edits resume for **that session** (locked in UI).

---

## What works with real API today

- Course CRUD, schedule proposal / approve / reject
- Enrollment applications (submit, list, admin approve)
- Basic course + schedule read for student/teacher views

## What is still frontend-only (needs backend)

| Feature | Today | We need |
|--------|--------|---------|
| Final grades | `localStorage` | Save grades per student per course |
| Certificates | `localStorage` + PDF generated in browser | Issue cert, store PDF, return download URL + number |
| Attendance % | QR + `localStorage` | Real attendance per session |
| Completion + reviews | `localStorage` | When class is done + save ratings |
| Invoice/receipt numbers | Sometimes demo if API empty | Always set on **approve** |
| Class resume posts | `localStorage` | CRUD API |
| Substitute invites | Demo store | Persist invites + session assignment |

---

## Certificate PDF (current FE behavior)

- Template: `public/certificate-template.pdf`
- Filled in the browser when instructor clicks **Publish**
- Fields: **student name**, **course name**, **exam score %**, **instructor name**, **date**
- Fonts: Savoye Let (name), Outfit (other lines)
- Names are title-cased (e.g. `rifkrifk` → `Rifkrifk`)

**Later:** backend generates or stores the PDF and returns a link.

---

## Schedule payload (unchanged)

Admin UI groups sessions by month, but the API still gets a **flat list**:

```json
{
  "sessionCount": 12,
  "sessions": [
    { "title": "Session 1", "sessionDate": "2026-06-01", "sessionTime": "10:00:00" }
  ]
}
```

---

## Suggested API priorities

**First**

1. Approve enrollment → return `invoiceNumber`, `receiptNumber`, amounts, dates.
2. Final grades per student in a course.
3. Issue certificate → `certificateNumber` + PDF URL.
4. Attendance records per session.

**Then**

5. Completion status + reviews (instructor / platform).
6. Substitute invites with `sessionSlotKey` (or session index).
7. Class resume notes API.

---

## More detail (other docs)

- [fe-enrollment-invoice-handoff.md](./fe-enrollment-invoice-handoff.md) — invoices & receipts
- [fe-student-course-completion-handoff.md](./fe-student-course-completion-handoff.md) — congrats, reviews, certificates
- [fe-payments-payroll-handoff.md](./fe-payments-payroll-handoff.md) — admin/student payments (demo)

---

## Questions for backend

1. Will certificates be generated on **server** or keep **browser PDF** for now?
2. On enrollment approve, which fields are guaranteed on the response?
3. How do we mark **paid tuition months** (1, 2, or 3) for schedule access?
4. One attendance row per session per student — OK?

Reply on any of the above and we’ll wire the FE to your endpoints.
