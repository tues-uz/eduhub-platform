export type CourseReviewTarget = "INSTRUCTOR" | "PLATFORM";

export type CourseReviewRecord = {
  target: CourseReviewTarget;
  rating: number;
  comment?: string;
  submittedAt: string;
};

type StoredReviews = {
  instructor?: CourseReviewRecord;
  platform?: CourseReviewRecord;
};

let memoryReviewsMap: Record<string, StoredReviews> = {};

function storageKey(courseId: string, emailNorm: string): string {
  return `${encodeURIComponent(courseId)}__${emailNorm.trim().toLowerCase()}`;
}

function load(courseId: string, emailNorm: string): StoredReviews {
  return memoryReviewsMap[storageKey(courseId, emailNorm)] ?? {};
}

function save(courseId: string, emailNorm: string, data: StoredReviews): void {
  memoryReviewsMap[storageKey(courseId, emailNorm)] = data;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COURSE_REVIEWS_CHANGED, {
        detail: { courseId, emailNorm },
      }),
    );
  }
}


export function getStudentCourseReviewSummary(
  courseId: string,
  emailNorm: string,
): StudentCourseReviewSummary {
  const data = load(courseId, emailNorm);
  return {
    instructorRating: data.instructor?.rating ?? null,
    platformRating: data.platform?.rating ?? null,
    instructorComment: data.instructor?.comment,
    platformComment: data.platform?.comment,
    instructorSubmittedAt: data.instructor?.submittedAt,
    platformSubmittedAt: data.platform?.submittedAt,
  };
}

export function getCourseReview(
  courseId: string,
  emailNorm: string,
  target: CourseReviewTarget,
): CourseReviewRecord | undefined {
  const data = load(courseId, emailNorm);
  return target === "INSTRUCTOR" ? data.instructor : data.platform;
}

import { eduhubCompletion, getAccessToken } from "@/api/eduhubClient";

export function saveCourseReview(
  courseId: string,
  emailNorm: string,
  review: CourseReviewRecord,
): void {
  const data = load(courseId, emailNorm);
  if (review.target === "INSTRUCTOR") {
    data.instructor = review;
  } else {
    data.platform = review;
  }
  save(courseId, emailNorm, data);

  if (getAccessToken() && courseId.trim()) {
    void eduhubCompletion
      .submitReview(courseId, {
        target: review.target,
        rating: review.rating,
        comment: review.comment,
      })
      .catch((err) => {
        console.warn("[CourseReviews] Backend API sync failed, saved locally", err);
      });
  }
}

export function hasSubmittedBothReviews(courseId: string, emailNorm: string): boolean {
  const data = load(courseId, emailNorm);
  return Boolean(data.instructor && data.platform);
}

/** All instructor-target reviews submitted for a course (demo: scans localStorage). */
export function listInstructorReviewsForCourse(courseId: string): CourseInstructorReviewListItem[] {
  if (!courseId.trim()) return [];
  const prefix = `${encodeURIComponent(courseId)}__`;
  const items: CourseInstructorReviewListItem[] = [];
  for (const [key, data] of Object.entries(memoryReviewsMap)) {
    if (!key.startsWith(prefix)) continue;
    const emailNorm = key.slice(prefix.length).trim().toLowerCase();
    if (!emailNorm || !data.instructor?.rating) continue;
    items.push({
      emailNorm,
      rating: data.instructor.rating,
      comment: data.instructor.comment,
      submittedAt: data.instructor.submittedAt,
    });
  }
  items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return items;
}

