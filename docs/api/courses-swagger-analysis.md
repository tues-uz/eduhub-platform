# Courses API — Swagger analysis (Available Courses for students)

**Swagger:** https://eduhub-platform-api-staging.kubeletto.app/swagger-ui/index.html  
**OpenAPI JSON:** https://eduhub-platform-api-staging.kubeletto.app/v3/api-docs

## Can students explore courses created by lecturers?

**Yes.** Two endpoints are relevant:

| Endpoint | Method | OperationId | Purpose |
|----------|--------|-------------|---------|
| **GET /api/v1/courses** | GET | **getAllPublishedCourses** | Returns **published** courses. This is the public catalog: courses that lecturers created and then **published**. Students can browse these. |
| **GET /api/v1/courses/my-courses** | GET | **getMyCourses** | Returns courses for the current user (exact semantics defined by backend: e.g. “courses I teach” for lecturers, or “courses available to me” for students). |
| **GET /api/v1/courses/lecturer/{lecturerId}** | GET | **getCoursesByLecturer** | Returns courses created by one lecturer. Requires knowing `lecturerId`. |

## Why “No courses available yet” appears

1. **GET /courses returns only published courses**  
   If lecturers only **create** courses but never **publish** them (PATCH `/api/v1/courses/{id}/publish`), then GET /courses returns an empty list. Students will see no courses until at least one course is published.

2. **GET /courses/my-courses**  
   If the backend uses this for “courses I teach” (lecturer) or “available to me” (student), it may return an empty list for students until the backend is configured to return lecturer-created courses here.

3. **Auth**  
   Both GET /courses and GET /courses/my-courses are called with the Bearer token when the user is logged in. If the backend requires auth and the student is not logged in, or returns 401, the frontend falls back and may still show nothing if the fallback also fails or returns empty.

## Recommendation

- **Backend:** For students to explore lecturer-created courses:
  - Implement GET **/courses** so it returns all **published** courses (created by lecturers and then published). This matches the Swagger name `getAllPublishedCourses`.
  - Ensure lecturers can **publish** a course (e.g. PATCH `/api/v1/courses/{id}/publish`) after creating it.
- **Frontend:** Uses GET /courses first (published catalog), then GET /courses/my-courses if needed, then local teacher store for same-browser demo. So students see any course that is **published** in the API.
