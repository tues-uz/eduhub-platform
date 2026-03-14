# Quiz API — Swagger analysis

**Swagger:** https://eduhub-platform-api-staging.kubeletto.app/swagger-ui/index.html  
**OpenAPI JSON:** https://eduhub-platform-api-staging.kubeletto.app/v3/api-docs

## Quiz endpoints (tag: Quizzes)

Quizzes in the API are **attached to a lesson**: each quiz belongs to a specific course → module → lesson. All paths use `courseId`, `moduleId`, and `lessonId`.

| Method | Path | OperationId | Purpose |
|--------|------|-------------|---------|
| **GET** | `/api/v1/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}/quiz` | getQuiz | Get quiz (full, for lecturer – includes correct answers). |
| **PUT** | same | updateQuiz | Update quiz. Body: `QuizRequest`. |
| **POST** | same | createQuiz | Create quiz for this lesson. Body: `QuizRequest`. |
| **DELETE** | same | deleteQuiz | Delete quiz. |
| **PATCH** | `.../quiz/publish` | publishQuiz | Publish quiz (students can take it). |
| **PATCH** | `.../quiz/unpublish` | unpublishQuiz | Unpublish quiz. |
| **GET** | `.../quiz/student` | **getQuizForStudent** | Get quiz for student (no correct answers). Response: `QuizResponseForStudent`. |
| **POST** | `.../quiz/submit` | **submitQuiz** | Submit student answers. Body: `QuizSubmissionRequest`. Response: `QuizResultResponse`. |
| **GET** | `.../quiz/results` | getQuizResults | Get all attempts (for lecturer). |
| **GET** | `.../quiz/my-results` | getStudentQuizResults | Get current student’s attempts for this quiz. |

## Request/response shapes (summary)

- **QuizRequest:** `title`, `description`, `timeLimitMinutes`, `passingScore`, `shuffleQuestions`, `showCorrectAnswers`, `questions[]` (each: `question`, `explanation`, `imageUrl`, `orderIndex`, `points`, `options[]` with `letter`, `text`, `isCorrect`).
- **QuizResponse:** Full quiz with `questions[]` and option `isCorrect` (for lecturer).
- **QuizResponseForStudent:** Quiz with `questions[]` and options **without** `isCorrect` (student view).
- **QuizSubmissionRequest:** `answers[]` (`questionId`, `selectedOptionId`), `timeSpentSeconds`.
- **QuizResultResponse:** `correctAnswers`, `score`, `passed`, `startedAt`, `completedAt`, `timeSpentSeconds`, `answers[]` (per-question result).

## How this fits the current app

1. **Teacher:** The app currently uses **local** quizzes (teacherQuizStore). To use the API, when creating/editing a quiz the teacher would need to pick a **course + module + lesson** (or create a lesson of type QUIZ_LINK), then:
   - **POST** createQuiz or **PUT** updateQuiz with `QuizRequest`.
   - **PATCH** .../quiz/publish when the quiz is ready for students.

2. **Student:** There is no “list all my quizzes” in the API. Students see quizzes **per lesson**:
   - From **My Courses** → open a course → open a module → open a **lesson** that has a quiz.
   - **GET** .../quiz/student (courseId, moduleId, lessonId) to load the quiz (no correct answers).
   - Student answers; then **POST** .../quiz/submit with `QuizSubmissionRequest`.
   - **GET** .../quiz/my-results to show the student their past attempts.

So “quiz in student dashboard” can work in two ways:

- **A) Lesson-based:** Student dashboard shows “My courses”; inside a course, lessons that have a quiz are marked or open to a quiz tab. When they open that lesson, the app calls getQuizForStudent and shows the quiz; on submit, submitQuiz. No separate “Quiz” list needed – quizzes are encountered inside lessons.
- **B) Dedicated Quiz list:** Backend would need an endpoint like “GET /quizzes/available” or “GET /enrollments/me/lessons-with-quizzes” that returns lessons (or quiz summaries) the student can take. Then the current “Quiz” page could call that and list them; clicking one would go to the lesson quiz (or a dedicated quiz take page) and use getQuizForStudent + submitQuiz.

## Frontend client (current)

`src/api/eduhubClient.ts` already has:

- `eduhubQuizzes.get(courseId, moduleId, lessonId)` → GET quiz (lecturer).
- `eduhubQuizzes.getResults(courseId, moduleId, lessonId)` → GET results.
- Publish is referenced in comments; **submit** and **getQuizForStudent** are not yet implemented.

Next steps to use your API fully:

1. Add **getQuizForStudent**, **submitQuiz**, and **publish** (and optionally unpublish) to `eduhubClient.ts` with the request/response types above.
2. Decide student flow: (A) quiz inside lesson page only, or (B) add an “available quizzes” endpoint and a Quiz list that links to lesson quizzes.
3. When a teacher creates a quiz in the app, optionally sync to API (create/update quiz for a chosen lesson) and call publish so students can take it via (A) or (B).
