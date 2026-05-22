# FE handoff — Enrollment invoice & receipt

Last updated: 2026-05-19

## Overview

When an admin **approves** an enrollment application, the student should receive official **invoice** and **receipt** numbers and can download a PDF styled like the school receipt template.

Until the backend assigns numbers, the FE uses a **demo** sequence in `localStorage` (watermarked in PDF when `import.meta.env.DEV`).

## API fields (`EnrollmentApplicationResponse`)

| Field | Type | When set |
|-------|------|----------|
| `invoiceNumber` | string | On approve |
| `receiptNumber` | string | On approve |
| `paymentMethod` | string | On approve (e.g. `BANK_TRANSFER`) |
| `invoiceIssuedAt` | ISO string | On approve |
| `receiptIssuedAt` | ISO string | On approve |
| `amountPaid` | number | On approve |

Number format: `INV.EDUHUB.{YYMM}-{seq}` and `REC.EDUHUB.{YYMM}-{seq}` (same `seq` suffix).

## Endpoints

- `PATCH /admin/enrollment-applications/:id/approve` — must atomically assign INV+REC and return them on the response body.
- `GET /enrollment-applications/me?email=` — include document fields for approved rows.

`POST /enrollment-applications` should **not** assign official numbers (student gets submission confirmation PDF only).

### Submit body — payment method

| Field | Values | Notes |
|-------|--------|-------|
| `paymentMethod` | `CASH` \| `BANK_TRANSFER` | Required on submit |
| `paymentProofUrl` | string | Omit when `CASH` |
| `idCardUrl` | string | Omit when `CASH` |

FE skips verification uploads when `paymentMethod` is `CASH`.

## FE modules

- [`src/features/enrollment/enrollmentReceiptPdf.ts`](../src/features/enrollment/enrollmentReceiptPdf.ts) — official receipt PDF
- [`src/features/enrollment/enrollmentApplicationPdf.ts`](../src/features/enrollment/enrollmentApplicationPdf.ts) — submission confirmation (no INV/REC)
- [`src/features/enrollment/enrollmentDocuments.ts`](../src/features/enrollment/enrollmentDocuments.ts) — merge API + local demo store
- [`src/features/enrollment/enrollmentApproval.ts`](../src/features/enrollment/enrollmentApproval.ts) — post-approve notify + demo numbers

## Demo localStorage key

- `eduhub_enrollment_documents_v1` — map `applicationId` → document fields when API omits them
