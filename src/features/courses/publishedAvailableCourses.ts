import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";

const CACHE_KEY = "eduhub_published_available_courses_v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED =
  "eduhub-published-available-courses-changed";

type CachePayload = {
  savedAt: number;
  courses: CourseSummaryResponse[];
};

/** Classroom-style covers for public landing demo cards (API list requires login). */
const DEMO_CLASS_THUMBS = [
  "/eduhub/blog/ielts-registration-room.png",
  "/eduhub/blog/bloomberg-lab-classroom.png",
  "/eduhub/blog/bloomberg-lab.png",
  "/eduhub/blog/awarding-day-group.png",
  "/eduhub/blog/bloomberg-lab-certificates.png",
  "/eduhub/blog/awarding-day-certificate.png",
  "/eduhub/vision-community.png",
  "/eduhub/hero/1.png",
] as const;

/** Always-available landing cards when live Available Classes cannot be loaded. */
export const LANDING_DEMO_AVAILABLE_CLASSES: CourseSummaryResponse[] = [
  {
    id: "demo-ielts-prep",
    title: "IELTS Preparation Intensive",
    thumbnailUrl: DEMO_CLASS_THUMBS[0],
    status: "PUBLISHED",
    category: "Exam Prep",
    level: "B2",
    lecturerName: "Indiana Ayu Alwasilah",
    enrollmentCount: 18,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 1_000_000, currency: "UZS", discountPercent: 0, discountedAmount: 1_000_000 },
  },
  {
    id: "demo-business-english",
    title: "Business English Communication",
    thumbnailUrl: DEMO_CLASS_THUMBS[1],
    status: "PUBLISHED",
    category: "English",
    level: "B1",
    lecturerName: "Riyadi Maulaya",
    enrollmentCount: 14,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 950_000, currency: "UZS", discountPercent: 0, discountedAmount: 950_000 },
  },
  {
    id: "demo-general-english",
    title: "General English Foundations",
    thumbnailUrl: DEMO_CLASS_THUMBS[2],
    status: "PUBLISHED",
    category: "English",
    level: "A2",
    lecturerName: "Abdurazakova Samira",
    enrollmentCount: 22,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 850_000, currency: "UZS", discountPercent: 0, discountedAmount: 850_000 },
  },
  {
    id: "demo-academic-writing",
    title: "Academic Writing Workshop",
    thumbnailUrl: DEMO_CLASS_THUMBS[3],
    status: "PUBLISHED",
    category: "Academic",
    level: "B2",
    lecturerName: "Saidakhmedova Dilfuzakhon",
    enrollmentCount: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 900_000, currency: "UZS", discountPercent: 0, discountedAmount: 900_000 },
  },
  {
    id: "demo-speaking-club",
    title: "Speaking Club Fluency",
    thumbnailUrl: DEMO_CLASS_THUMBS[4],
    status: "PUBLISHED",
    category: "Speaking",
    level: "B1",
    lecturerName: "Jurakulova Yulduz",
    enrollmentCount: 16,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 700_000, currency: "UZS", discountPercent: 0, discountedAmount: 700_000 },
  },
  {
    id: "demo-kids-english",
    title: "Kids English Adventure",
    thumbnailUrl: DEMO_CLASS_THUMBS[5],
    status: "PUBLISHED",
    category: "Kids",
    level: "A1",
    lecturerName: "Tursunova Yuliroz",
    enrollmentCount: 20,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 750_000, currency: "UZS", discountPercent: 0, discountedAmount: 750_000 },
  },
  {
    id: "demo-toeic",
    title: "TOEIC Career Track",
    thumbnailUrl: DEMO_CLASS_THUMBS[6],
    status: "PUBLISHED",
    category: "Exam Prep",
    level: "B1",
    lecturerName: "Sardor Khusanovich",
    enrollmentCount: 11,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 980_000, currency: "UZS", discountPercent: 0, discountedAmount: 980_000 },
  },
  {
    id: "demo-conversation",
    title: "Everyday Conversation Practice",
    thumbnailUrl: DEMO_CLASS_THUMBS[7],
    status: "PUBLISHED",
    category: "Speaking",
    level: "A2",
    lecturerName: "Buriyeva Shakhnoza",
    enrollmentCount: 19,
    createdAt: "2026-01-01T00:00:00.000Z",
    pricing: { amount: 680_000, currency: "UZS", discountPercent: 0, discountedAmount: 680_000 },
  },
];

export function readPublishedAvailableCoursesCache(): CourseSummaryResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.savedAt || !Array.isArray(parsed.courses)) return [];
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return [];
    return parsed.courses;
  } catch {
    return [];
  }
}

function writeCache(courses: CourseSummaryResponse[]) {
  if (typeof window === "undefined" || courses.length === 0) return;
  try {
    const payload: CachePayload = { savedAt: Date.now(), courses };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED));
  } catch {
    // Ignore quota / private mode.
  }
}

function normalizeList(rows: CourseSummaryResponse[] | null | undefined): CourseSummaryResponse[] {
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((c) => {
    if (!c?.id || !c?.title) return false;
    if (c.status && c.status !== "PUBLISHED") return false;
    return true;
  });
}

/**
 * Prefer live Available Classes (student catalog), then cache, then demo cards
 * so the landing section always has class cards to show.
 */
export async function fetchPublishedAvailableCourses(
  size = 100,
): Promise<CourseSummaryResponse[]> {
  try {
    const rows = normalizeList(await eduhubCourses.getAll({ page: 0, size }));
    if (rows.length > 0) {
      writeCache(rows);
      return rows;
    }
  } catch {
    // Guests get 401.
  }

  try {
    const rows = normalizeList(await eduhubCourses.getAvailableCourses({ page: 0, size }));
    if (rows.length > 0) {
      writeCache(rows);
      return rows;
    }
  } catch {
    // Fall through.
  }

  const cached = readPublishedAvailableCoursesCache();
  if (cached.length > 0) return cached;

  return LANDING_DEMO_AVAILABLE_CLASSES.slice(0, Math.min(size, LANDING_DEMO_AVAILABLE_CLASSES.length));
}
