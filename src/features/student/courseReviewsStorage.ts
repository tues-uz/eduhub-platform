export type CourseReviewTarget = "INSTRUCTOR" | "PLATFORM";

export type CourseReviewRecord = {
  target: CourseReviewTarget;
  rating: number;
  comment?: string;
  submittedAt: string;
};

const STORAGE_PREFIX = "eduhub_course_reviews__";

export const COURSE_REVIEWS_CHANGED = "eduhub-course-reviews-changed";

export type StudentCourseReviewSummary = {
  instructorRating: number | null;
  platformRating: number | null;
  instructorComment?: string;
  platformComment?: string;
  instructorSubmittedAt?: string;
  platformSubmittedAt?: string;
};

export type CourseInstructorReviewListItem = {
  emailNorm: string;
  rating: number;
  comment?: string;
  submittedAt: string;
};

function storageKey(courseId: string, emailNorm: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(courseId)}__${emailNorm.trim().toLowerCase()}`;
}

type StoredReviews = {
  instructor?: CourseReviewRecord;
  platform?: CourseReviewRecord;
};

function load(courseId: string, emailNorm: string): StoredReviews {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(courseId, emailNorm));
    if (!raw) return {};
    return JSON.parse(raw) as StoredReviews;
  } catch {
    return {};
  }
}

function save(courseId: string, emailNorm: string, data: StoredReviews): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(courseId, emailNorm), JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent(COURSE_REVIEWS_CHANGED, {
        detail: { courseId, emailNorm },
      }),
    );
  } catch {
    /* ignore */
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
  if (typeof window === "undefined" || !courseId.trim()) return [];
  const prefix = `${STORAGE_PREFIX}${encodeURIComponent(courseId)}__`;
  const items: CourseInstructorReviewListItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const emailNorm = key.slice(prefix.length).trim().toLowerCase();
      if (!emailNorm) continue;
      const data = load(courseId, emailNorm);
      const instructor = data.instructor;
      if (!instructor?.rating) continue;
      items.push({
        emailNorm,
        rating: instructor.rating,
        comment: instructor.comment,
        submittedAt: instructor.submittedAt,
      });
    }
  } catch {
    /* ignore */
  }
  items.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return items;
}
