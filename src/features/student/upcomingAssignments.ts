import { eduhubAssignments, eduhubEnrollments } from "@/api/eduhubClient";

export type UpcomingAssignmentItem = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  dueDate: string;
  dueMs: number;
};

/** Published assignments (across all enrolled classes) the student hasn't submitted yet, nearest due date first. */
export async function fetchStudentUpcomingAssignments(limit = 20): Promise<UpcomingAssignmentItem[]> {
  const enrollments = await eduhubEnrollments.getMy();
  const courseIds = Array.from(new Set(enrollments.map((e) => e.course.id)));

  const perCourse = await Promise.all(
    courseIds.map(async (courseId) => {
      try {
        const assignments = await eduhubAssignments.getByCourse(courseId);
        return assignments.filter((a) => a.status === "PUBLISHED");
      } catch {
        return [];
      }
    }),
  );

  const published = perCourse.flat();

  const withSubmissionState = await Promise.all(
    published.map(async (a) => {
      try {
        const submission = await eduhubAssignments.getMySubmission(a.id);
        return { assignment: a, submitted: submission != null };
      } catch {
        return { assignment: a, submitted: false };
      }
    }),
  );

  const items: UpcomingAssignmentItem[] = [];
  for (const { assignment, submitted } of withSubmissionState) {
    if (submitted || !assignment.dueDate) continue;
    const dueMs = new Date(assignment.dueDate).getTime();
    if (Number.isNaN(dueMs)) continue;
    items.push({
      id: assignment.id,
      courseId: assignment.course.id,
      courseTitle: assignment.course.title,
      title: assignment.title,
      dueDate: assignment.dueDate,
      dueMs,
    });
  }

  items.sort((a, b) => a.dueMs - b.dueMs);
  return items.slice(0, limit);
}
