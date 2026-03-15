# Teacher Features - Frontend Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect the remaining teacher features (Quiz, Assignments) from localStorage/mock data to the backend APIs.

**Architecture:** 
- Quiz: Already has backend API at `/api/v1/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quiz`
- Assignments: New backend API created at `/api/v1/courses/{courseId}/assignments` and `/api/v1/assignments/{id}/submissions`
- Frontend needs to connect to these APIs instead of localStorage

**Tech Stack:** React, TypeScript, eduhubClient.ts API wrapper

---

## Task 1: Connect Quiz Results Page to API

**Files:**
- Modify: `eduhub-platform/src/features/teacher/pages/TeacherQuizResultsPage.tsx`
- Modify: `eduhub-platform/src/features/teacher/pages/TeacherQuizPage.tsx`
- Modify: `eduhub-platform/src/api/eduhubClient.ts`
- Test: Manual browser test

**Step 1: Add Quiz API client methods**

Modify `eduhub-platform/src/api/eduhubClient.ts` - Add after line 260 (before Enrollments):

```typescript
/** Quiz - tied to lessons */
export const eduhubQuizzes = {
  get: (courseId: string, moduleId: string, lessonId: string) =>
    request<QuizResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz`),

  getResults: (courseId: string, moduleId: string, lessonId: string) =>
    request<QuizResultResponse[]>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/results`),

  publish: (courseId: string, moduleId: string, lessonId: string) =>
    request<QuizResponse>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/publish`, { method: "PATCH" }),
};
```

Need to add types:
```typescript
export interface QuizResponse {
  id: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  passingScore: number;
  isPublished: boolean;
  questions: QuizQuestionResponse[];
}

export interface QuizQuestionResponse {
  id: string;
  question: string;
  imageUrl?: string;
  timeLimitSeconds?: number;
  points: number;
  options: QuizOptionResponse[];
}

export interface QuizOptionResponse {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizResultResponse {
  id: string;
  student: { id: string; fullName: string; email: string };
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
}
```

**Step 2: Update TeacherQuizResultsPage**

The page currently reads from localStorage via `teacherQuizStore`. Need to:
1. Accept courseId, moduleId, lessonId from route params
2. Fetch results from API instead of localStorage
3. Handle loading/error states

Update the component to use `eduhubQuizzes.getResults(courseId, moduleId, lessonId)` instead of localStorage.

**Step 3: Test**

Run `npm run dev` and navigate to `/dashboard/teacher/placement-test` to verify quiz results load.

**Step 4: Commit**

```bash
git add src/api/eduhubClient.ts src/features/teacher/pages/TeacherQuizResultsPage.tsx
git commit -m "feat: connect quiz results to API"
```

---

## Task 2: Create Assignments Page

**Files:**
- Create: `eduhub-platform/src/features/teacher/pages/TeacherAssignmentsPage.tsx`
- Modify: `eduhub-platform/src/api/eduhubClient.ts`
- Modify: Router config (if needed)

**Step 1: Add Assignments API client**

Modify `eduhub-platform/src/api/eduhubClient.ts` - Add after eduhubLecturer:

```typescript
/** Assignments */
export const eduhubAssignments = {
  getByCourse: (courseId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<PageResponse<AssignmentResponse>>(`/courses/${courseId}/assignments?${sp}`);
  },

  create: (courseId: string, body: AssignmentRequest) =>
    request<AssignmentResponse>(`/courses/${courseId}/assignments`, { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: AssignmentRequest) =>
    request<AssignmentResponse>(`/assignments/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: string) => request<void>(`/assignments/${id}`, { method: "DELETE" }),

  getSubmissions: (assignmentId: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    return request<PageResponse<SubmissionResponse>>(`/assignments/${assignmentId}/submissions?${sp}`);
  },

  gradeSubmission: (submissionId: string, body: GradeRequest) =>
    request<SubmissionResponse>(`/submissions/${submissionId}/grade`, { method: "PATCH", body: JSON.stringify(body) }),

  getPending: (lecturerId: string, priority?: string, page = 0, size = 20) => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("size", String(size));
    if (priority) sp.set("priority", priority);
    return request<PageResponse<SubmissionResponse>>(`/lecturers/${lecturerId}/submissions/pending?${sp}`);
  },
};
```

Add types:
```typescript
export interface AssignmentRequest {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  maxScore?: number;
  attachments?: string[];
  status?: "DRAFT" | "PUBLISHED" | "CLOSED";
}

export interface AssignmentResponse {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  maxScore: number;
  attachments: string[];
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  course: { id: string; title: string };
  lecturer: { id: string; fullName: string };
  createdAt: string;
}

export interface SubmissionResponse {
  id: string;
  content: string;
  attachments: string[];
  status: "SUBMITTED" | "GRADED" | "RETURNED";
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: { id: string; fullName: string };
  score?: number;
  feedback?: string;
  assignment: AssignmentResponse;
  student: { id: string; fullName: string; email: string };
}

export interface GradeRequest {
  score: number;
  feedback?: string;
}
```

**Step 2: Create TeacherAssignmentsPage**

Create `eduhub-platform/src/features/teacher/pages/TeacherAssignmentsPage.tsx`:
- Show list of assignments (fetch from API by course)
- Show pending submissions with grade button
- Include: title, due date, priority, submission count
- Actions: View submissions, Grade, Delete

Base it on the existing `TeacherQuizPage.tsx` layout and `TeacherStudentsPage.tsx` table structure.

**Step 3: Test**

Run `npm run dev` and navigate to `/dashboard/teacher/assignments` to verify page loads and displays data.

**Step 4: Commit**

```bash
git add src/api/eduhubClient.ts src/features/teacher/pages/TeacherAssignmentsPage.tsx
git commit -m "feat: add assignments page with API integration"
```

---

## Task 3: Update Router

**Files:**
- Modify: Router configuration (find the file with teacher routes)

**Step 1: Add route**

Add route for assignments page:
```typescript
{
  path: "/dashboard/teacher/assignments",
  element: <TeacherAssignmentsPage />,
},
```

**Step 2: Commit**

```bash
git add src/App.tsx  # or wherever routes are defined
git commit -m "feat: add assignments route"
```

---

## Summary

| Task | Files | Priority |
|------|-------|----------|
| 1. Quiz Results API | eduhubClient.ts, TeacherQuizResultsPage.tsx | High |
| 2. Assignments Page | eduhubClient.ts, TeacherAssignmentsPage.tsx | High |
| 3. Router Update | App.tsx | Medium |

---

**Plan complete.** 

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
