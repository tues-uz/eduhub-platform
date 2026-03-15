# Teacher Features API Design

**Date:** 2026-03-12  
**Status:** Draft  
**Project:** EduHub Platform

---

## Overview

This document outlines the backend API design for lecturer (teacher) features based on the frontend implementation in `eduhub-platform/`. The frontend currently has working course management, but quiz, assignments, and student features use localStorage or mock data and need backend API integration.

---

## 1. Quiz / Placement Test API

### 1.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/quizzes` | Create a quiz |
| GET | `/api/v1/quizzes` | List lecturer's quizzes |
| GET | `/api/v1/quizzes/{id}` | Get quiz with questions |
| PUT | `/api/v1/quizzes/{id}` | Update quiz |
| DELETE | `/api/v1/quizzes/{id}` | Delete quiz |
| GET | `/api/v1/quizzes/{id}/attempts` | Get quiz attempts (results) |
| POST | `/api/v1/quizzes/{id}/publish` | Publish quiz |

### 1.2 Data Models

**Quiz**
```java
- id: UUID
- lecturerId: UUID
- title: String (max 200)
- type: Enum (QUIZ, PLACEMENT_TEST)
- courseId: UUID (optional, FK to courses)
- releaseDate: LocalDate (optional)
- releaseTime: LocalTime (optional)
- status: Enum (DRAFT, PUBLISHED)
- createdAt: Timestamp
- updatedAt: Timestamp
```

**QuizQuestion**
```java
- id: UUID
- quizId: UUID (FK)
- questionText: String (max 2000)
- imageUrl: String (optional)
- timeLimitSeconds: Integer (default 30, max 300)
- orderIndex: Integer
- createdAt: Timestamp
- updatedAt: Timestamp
```

**QuizOption**
```java
- id: UUID
- questionId: UUID (FK)
- optionText: String (max 500)
- isCorrect: Boolean
- orderIndex: Integer
```

**QuizAttempt**
```java
- id: UUID
- quizId: UUID (FK)
- studentId: UUID (FK)
- scorePercent: Integer (0-100)
- correctCount: Integer
- totalQuestions: Integer
- answers: JSON (student's answers)
- completedAt: Timestamp
```

### 1.3 API Responses

**Create Quiz**
```json
POST /api/v1/quizzes
{
  "title": "Economics Quiz 1",
  "type": "QUIZ",
  "courseId": "uuid-optional",
  "questions": [
    {
      "questionText": "What is supply?",
      "imageUrl": "optional",
      "timeLimitSeconds": 30,
      "orderIndex": 0,
      "options": [
        { "optionText": "A: Goods available", "isCorrect": false, "orderIndex": 0 },
        { "optionText": "B: Goods offered for sale", "isCorrect": true, "orderIndex": 1 },
        { "optionText": "C: Consumer demand", "isCorrect": false, "orderIndex": 2 },
        { "optionText": "D: Market price", "isCorrect": false, "orderIndex": 3 }
      ]
    }
  ]
}
```

**Quiz Results (for Lecturer)**
```json
GET /api/v1/quizzes/{id}/attempts

{
  "content": [
    {
      "id": "uuid",
      "student": { "id": "...", "fullName": "Alex Chen", "email": "alex@example.com" },
      "scorePercent": 80,
      "correctCount": 4,
      "totalQuestions": 5,
      "completedAt": "2025-03-10T14:30:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 15
}
```

---

## 2. Students & Enrollment API

### 2.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/courses/{courseId}/enrollments` | List students in course |
| GET | `/api/v1/lecturers/{id}/enrollments` | All enrollments for lecturer |
| GET | `/api/v1/enrollments/{id}` | Get enrollment details |
| PATCH | `/api/v1/enrollments/{id}/progress` | Update student progress |
| GET | `/api/v1/lecturers/{id}/stats` | Dashboard statistics |

### 2.2 Data Models

**EnrollmentResponse**
```json
{
  "id": "uuid",
  "student": {
    "id": "uuid",
    "fullName": "Alex Chen",
    "email": "alex@example.com",
    "avatarUrl": "optional"
  },
  "course": {
    "id": "uuid",
    "title": "Introduction to Economics",
    "thumbnailUrl": "optional"
  },
  "progress": 45,
  "status": "ACTIVE",
  "enrolledAt": "2025-02-15T10:00:00Z",
  "completedAt": null
}
```

**LecturerStats**
```json
GET /api/v1/lecturers/{id}/stats

{
  "totalCourses": 5,
  "totalStudents": 150,
  "activeEnrollments": 120,
  "completedEnrollments": 30,
  "pendingGrading": 12
}
```

---

## 3. Assignments & Grading API

### 3.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/courses/{courseId}/assignments` | List course assignments |
| POST | `/api/v1/courses/{courseId}/assignments` | Create assignment |
| GET | `/api/v1/assignments/{id}` | Get assignment details |
| PUT | `/api/v1/assignments/{id}` | Update assignment |
| DELETE | `/api/v1/assignments/{id}` | Delete assignment |
| GET | `/api/v1/assignments/{id}/submissions` | List submissions |
| POST | `/api/v1/assignments/{id}/submissions` | Student submits |
| PATCH | `/api/v1/submissions/{id}/grade` | Grade submission |
| GET | `/api/v1/lecturers/{id}/submissions/pending` | Pending submissions |

### 3.2 Data Models

**Assignment**
```java
- id: UUID
- courseId: UUID (FK)
- lecturerId: UUID (FK)
- title: String (max 200)
- description: String (optional, max 5000)
- dueDate: LocalDateTime (optional)
- priority: Enum (HIGH, MEDIUM, LOW)
- maxScore: Integer (default 100)
- attachments: List<String> (URLs)
- status: Enum (DRAFT, PUBLISHED, CLOSED)
- createdAt: Timestamp
- updatedAt: Timestamp
```

**Submission**
```java
- id: UUID
- assignmentId: UUID (FK)
- studentId: UUID (FK)
- content: String (text or URL)
- attachments: List<String> (URLs)
- status: Enum (SUBMITTED, GRADED, RETURNED)
- submittedAt: Timestamp
- gradedAt: Timestamp (nullable)
- gradedBy: UUID (nullable)
- score: Integer (nullable, 0-100)
- feedback: String (nullable, max 2000)
- createdAt: Timestamp
- updatedAt: Timestamp
```

### 3.3 API Responses

**Pending Submissions**
```json
GET /api/v1/lecturers/{id}/submissions/pending?priority=HIGH

{
  "content": [
    {
      "id": "uuid",
      "assignment": {
        "id": "uuid",
        "title": "Economic Analysis Essay",
        "priority": "HIGH",
        "dueDate": "2025-03-15T23:59:00Z"
      },
      "course": {
        "id": "uuid",
        "title": "Introduction to Economics"
      },
      "student": {
        "id": "uuid",
        "fullName": "Sevinch"
      },
      "submittedAt": "2025-03-10T14:00:00Z",
      "status": "SUBMITTED"
    }
  ]
}
```

**Grade Submission**
```json
PATCH /api/v1/submissions/{id}/grade

Request:
{
  "score": 85,
  "feedback": "Good analysis, but could expand on market structures."
}

Response:
{
  "id": "uuid",
  "score": 85,
  "feedback": "Good analysis...",
  "status": "GRADED",
  "gradedAt": "2025-03-12T10:00:00Z"
}
```

---

## 4. Implementation Priority

### Phase 1 - Core (Week 1-2)
1. Quiz CRUD with questions and options
2. Quiz publishing workflow
3. Quiz attempt submission and scoring
4. Enrollment list per course

### Phase 2 - Students (Week 2-3)
5. Lecturer dashboard stats
6. Student list per course
7. Progress tracking

### Phase 3 - Assignments (Week 3-4)
8. Assignment CRUD
9. Submission and grading
10. Pending submissions with priority

---

## 5. Security

- All `/quizzes`, `/assignments` endpoints require `LECTURER` role
- Students can only submit to published quizzes
- Lecturers can only manage courses they own
- All endpoints require valid JWT authentication

---

## 6. Frontend Integration

| Frontend File | Required Changes |
|---------------|------------------|
| `eduhubClient.ts` | Add `eduhubQuizzes`, `eduhubEnrollments`, `eduhubAssignments` |
| `TeacherQuizPage.tsx` | Connect to API instead of localStorage |
| `TeacherQuizResultsPage.tsx` | Fetch attempts from API |
| `TeacherStudentsPage.tsx` | Fetch enrolled students |
| `TeacherDashboard.tsx` | Fetch stats from API |
| New page | `/dashboard/teacher/assignments` |

---

## 7. Notes

- Quiz images stored as URLs (use existing `/api/v1/storage/upload`)
- Assignment attachments also use storage API
- Excel export can be done client-side (existing implementation)
- Consider adding quiz time limits enforcement via API for integrity
