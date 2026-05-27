# EduHub Student Dashboard — Design Reference

> Light-mode UI patterns for the student dashboard (`/dashboard/*`). This document reflects what is implemented in code today, not a separate marketing design system.

**Primary font:** DM Sans (`'DM Sans', sans-serif`)  
**Theme:** light only (white canvas, zinc/slate neutrals)

---

## Layout shell

### Structure

```
┌──────────────┬─────────────────────────────────────────────┐
│  Sidebar     │  Desktop header (search + notifications)    │
│  256px       ├─────────────────────────────────────────────┤
│  (lg+)       │  Page content (px-6 pt-4 pb-12)             │
└──────────────┴─────────────────────────────────────────────┘
```

| Breakpoint | Sidebar | Header | Content offset |
|------------|---------|--------|----------------|
| `< lg` | Hidden drawer (`z-[60]`) | Fixed mobile bar (`h-16`, `pt-16` on main) | `MOBILE_STUDENT_HEADER_OFFSET` |
| `≥ lg` | Fixed `w-64` (collapsed `w-20`) | Sticky `h-[4.5625rem]`, search left | `lg:ml-64`, `lg:pt-0` |

**Key files:** `StudentDashboardLayout.tsx`, `DashboardSidebar.tsx`, `DashboardPageHeader.tsx`

### Page content padding

- Default: `px-6 pt-4 pb-12`
- Flush hero pages (course detail, available class detail, resume): `pt-0`
- Course resume reader: `p-0` (full bleed)

### Z-index stack

| Layer | Value | Usage |
|-------|-------|--------|
| Mobile course footer | `z-40` | Scan QR, enrollment CTAs |
| Desktop sticky header | `z-30` | Class search bar |
| Mobile fixed header | `z-50` | Logo, search icon, notifications |
| Mobile search panel | `z-[60]` | Expanded search below header |
| Sidebar overlay / drawer | `z-[55]` / `z-[60]` | Mobile nav |

---

## Color tokens

### Brand

| Token | Hex | Usage |
|-------|-----|--------|
| Primary blue | `#3954d0` | Primary CTAs, active filters, links, focus rings |
| Primary hover | `#2f47b3` | Button hover states |
| Legacy accent | `#1e40af` | Some “Continue lesson” buttons on course detail |

### Neutrals

| Role | Tailwind | Usage |
|------|----------|--------|
| Page background | `bg-white` | Shell, cards |
| Muted surface | `bg-zinc-50/50`, `bg-slate-50` | Inset panels, schedule chips |
| Border | `border-zinc-200/80`, `border-gray-200/50` | Cards, sections |
| Body text | `text-zinc-900`, `text-foreground` | Headings, values |
| Secondary text | `text-zinc-500`, `text-zinc-600`, `text-foreground/70` | Labels, meta |
| Tertiary / links in header | `text-zinc-400` | “View All”, “View Calendar” |

### Status palettes (soft pills)

Use **filled soft background + ring**, not solid blocks on thumbnails (except enrolled badge on catalog).

| Status | Classes |
|--------|---------|
| In progress | `bg-yellow-50 text-yellow-900 ring-1 ring-yellow-200/80` |
| Almost complete | `bg-blue-50 text-blue-900 ring-1 ring-blue-200/80` |
| Completed | `bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80` |
| Live / ongoing | `bg-emerald-100 text-emerald-800` |
| Pending review | `bg-amber-100 text-amber-800` |
| Approved | `bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80` |
| Rejected | `bg-red-50 text-red-800 ring-1 ring-red-200/80` |
| Enrolled (catalog) | `bg-[#3954d0] text-white border border-white/50` |

**Detail row icon tones** (payment dialog): `blue`, `emerald`, `violet`, `sky`, `teal`, `amber`, `rose` — each `bg-{color}-50 text-{color}-600 ring-1 ring-{color}-100/80`.

---

## Typography

| Role | Size / weight | Notes |
|------|---------------|--------|
| Page title | `text-2xl sm:text-3xl font-bold` | DM Sans |
| Section title | `text-2xl font-bold` | Dashboard cards (“Upcoming Schedule”) |
| Card title | `text-lg font-bold` | My Class course cards |
| Subsection | `text-base font-semibold` | Session titles |
| Body | `text-sm` | Default copy |
| Label | `text-xs text-zinc-500` | Form/detail labels |
| Uppercase label | `text-[10px]–[11px] font-semibold uppercase tracking-wide` | Category chips, section eyebrows |
| Emphasized value | `text-sm font-semibold text-zinc-900` | Detail rows, certificate metadata |
| Large metric | `text-3xl font-bold tabular-nums` | Certificate score, amounts |
| Mono meta | `font-mono text-[11px] tabular-nums` | Certificate numbers |

**Section link actions** (“View All”, “View Calendar”): `text-sm text-zinc-400`, no padding (`h-auto px-0 py-0`), hover `text-zinc-500`.

---

## Spacing & radius

**Base unit:** 4px (Tailwind). Prefer **8px (`p-2`)**, **16px (`p-4`)**, **24px (`p-6`)** for panels.

| Element | Radius | Padding |
|---------|--------|---------|
| Page section card | `rounded-xl` | `px-4 py-6` |
| Course / certificate card | `rounded-xl` / `rounded-2xl` | `p-4`–`p-5` |
| Search input | `rounded-xl` | `h-11 pl-10` |
| Primary CTA | `rounded-xl` or `rounded-full` | `h-10`–`h-11`, full width on mobile footers |
| Status badge | `rounded-full` | `px-2.5 py-0.5`–`py-1` |
| Dialog | `rounded-2xl` | Inner sections `p-4` (16px) |
| Search dropdown | `rounded-xl` | Container `p-2`; items `rounded-lg` |
| Icon badge (detail) | `rounded-full` | `h-9 w-9` |

---

## Header & search

### Desktop header (`DashboardPageHeader`)

- White bar, bottom border, **no page title** (navigation lives in sidebar).
- **Left:** class search (`max-w-md xl:max-w-xl`).
- **Right:** notification icon only (ghost circle button).

### Class search (`DashboardClassSearch`)

**Header variant:**

```tsx
// Input
h-11 rounded-xl border-gray-200 pl-10 pr-14

// Icon
left-3 h-4 w-4 text-foreground/40

// Keyboard hint
kbd with "/" — focus search from anywhere (desktop)

// Dropdown
rounded-xl border shadow-lg p-2
Items: rounded-lg, hover bg-zinc-50, active bg-zinc-100
Footer: "View all results" — text-right, text-[#3954d0]
```

**Mobile:** compact icon opens fixed panel below `top-14` header (`z-[60]`).

### Header icon buttons

```tsx
// studentDashboardHeaderStyles.ts
inline-flex size-10 rounded-full text-zinc-500
hover:bg-zinc-100 hover:text-zinc-800
[&_svg]:size-[1.125rem]
```

---

## Cards

### My Class course card (`StudentCourses`)

- Container: `group rounded-xl border border-gray-100 shadow-md hover:shadow-lg`
- Thumbnail: `rounded-xl overflow-hidden`, image `group-hover:scale-105` (300ms)
- Status badge on thumbnail: soft pill (see status table)
- Title: **no blue hover** — stays `text-slate-900`
- Primary action: `rounded-xl bg-slate-900 text-white`

### Browse / available course card

- Price: `text-sm font-bold tabular-nums` (not `text-base`)
- Pending application CTA: neutral outline `border-zinc-200 bg-white` — **not amber/yellow**

### Certificate card

- Header: white background (not gray)
- Icon: gold gradient container + **outline** `GraduationCap` icon (`#5c4a00`)
- Metadata values: `font-semibold`

### Dashboard section card

```tsx
bg-white/80 backdrop-blur-sm rounded-xl shadow-sm
border border-gray-200/50 px-4 py-6
```

### Upcoming schedule row

```tsx
rounded-2xl border border-zinc-200/80 bg-white p-4
hover:border-[#3954d0]/25 hover:shadow-sm
Date chip: rounded-xl border (emerald when live)
```

---

## Tabs (course detail)

`SlidingPillTabsList` — pill track on `bg-muted`, sliding indicator **`bg-black`**, active label **`text-white font-bold`**.

Mobile tab labels shortened (“Content” vs “Class Content”); single-row horizontal scroll.

---

## Dialogs

### Enrollment payment detail

- Width: `max-w-[440px]`, mobile `w-[calc(100%-2rem)]`
- Padding: **`p-4`** (16px) on header, body, footer
- Close button: circular outline `rounded-full border border-zinc-200 bg-white`
- Title + status badge on **same row** (`flex-wrap gap-2`)
- Summary values: `font-semibold`
- Detail rows: tinted icon circles + `font-semibold` values

### Mobile dialogs

- Outer inset: `inset-4` / `w-[calc(100%-2rem)]` where applicable
- Safe area: `pb-[env(safe-area-inset-bottom)]` on footers

---

## Buttons

| Variant | Classes |
|---------|---------|
| Primary | `bg-[#3954d0] hover:bg-[#2f47b3] rounded-xl text-white` |
| Primary dark | `bg-slate-900 hover:bg-slate-800 rounded-xl` |
| Outline neutral | `border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 rounded-xl` |
| Ghost section link | `h-auto px-0 py-0 text-zinc-400 hover:text-zinc-500` |
| Filter pill (active) | inline style `backgroundColor: #3954d0` |

---

## Empty states

Shared pattern (`StudentQuizListEmptyState` and similar):

- Centered layout, 120×120 stroke illustration
- Dashed border container optional
- Primary CTA below copy

---

## Mobile-specific

| Pattern | Rule |
|---------|------|
| Fixed header | Logo + compact search + notifications + hamburger |
| Main offset | `pt-16` below fixed header |
| Page menu (⋮) | Hidden on mobile |
| Course footers | `fixed bottom-0 z-40`, full-width CTAs |
| Tables | Prefer card lists below `md` (e.g. payment history) |
| Attendance time column | Hide clock icon on mobile (`hidden sm:block`) |

---

## Grids

| Page | Columns |
|------|---------|
| My Class | `1 → sm:2 → lg:2 → min-[1300px]:4` |
| Browse classes | `1 → md:3 → xl:4` |
| Dashboard home | `1 → lg:3` (main `col-span-2` + sidebar column) |
| Certificates | `1 → md:3 → xl:4` |

---

## Do

- Use DM Sans for student-facing headings and dashboard chrome.
- Use `#3954d0` for primary actions and interactive emphasis.
- Use soft status pills with rings on light backgrounds and thumbnails.
- Use `font-semibold` for emphasized field values (not bold unless large metrics).
- Keep mobile footers at `z-40`; drawer/search overlay above at `z-[60]`.
- Use `rounded-xl` for search inputs and most cards; `rounded-full` for pills and some CTAs.
- Add thumbnail zoom on card hover via `group` + `group-hover:scale-105`.

## Don't

- Don't use amber/yellow for neutral secondary actions (e.g. “View application”) — use zinc outline.
- Don't turn course card titles blue on hover.
- Don't use solid yellow status badges on course thumbnails — use soft `yellow-50` pills.
- Don't use filled solid icons in certificate gold badge — use outline Heroicons.
- Don't pad section link buttons (“View All”) — keep them text-like.
- Don't put page titles in the desktop header when sidebar already shows context.

---

## Key source files

| Area | Path |
|------|------|
| Layout shell | `src/layouts/StudentDashboardLayout.tsx` |
| Home dashboard | `src/pages/StudentDashboard.tsx` |
| My Class | `src/pages/StudentCourses.tsx` |
| Browse | `src/pages/StudentAvailableCourses.tsx` |
| Course detail | `src/pages/StudentCourseDetail.tsx` |
| Certificates | `src/pages/StudentCertificates.tsx` |
| Payments | `src/pages/StudentPaymentInfo.tsx` |
| Payment dialog | `src/features/enrollment/StudentEnrollmentPaymentDetailDialog.tsx` |
| Header | `src/components/DashboardPageHeader.tsx` |
| Search | `src/components/DashboardClassSearch.tsx` |
| Header icons | `src/components/studentDashboardHeaderStyles.ts` |
| Sliding tabs | `src/components/ui/sliding-pill-tabs-list.tsx` |
| Enrollment badges | `src/features/enrollment/studentCourseEnrollmentStatus.ts` |

---

## Related

The repo also contains `src/docs/DESIGN.md` (Officevibe / marketing reference). That file is **not** the student dashboard implementation guide — use this document for EduHub student UI work.
