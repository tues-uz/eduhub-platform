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
}

export function hasSubmittedBothReviews(courseId: string, emailNorm: string): boolean {
  const data = load(courseId, emailNorm);
  return Boolean(data.instructor && data.platform);
}
