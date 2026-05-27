import type { TeacherCourse, TeacherLesson } from "../types";

const STORAGE_KEY = "eduhub_teacher_courses";

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadCourses(): TeacherCourse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeacherCourse[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCourses(courses: TeacherCourse[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

export const teacherCoursesStore = {
  getAll(): TeacherCourse[] {
    return loadCourses();
  },

  getById(id: string): TeacherCourse | undefined {
    return loadCourses().find((c) => c.id === id);
  },

  create(course: Omit<TeacherCourse, "id" | "createdAt" | "updatedAt">): TeacherCourse {
    const courses = loadCourses();
    const now = new Date().toISOString();
    const newCourse: TeacherCourse = {
      ...course,
      id: randomId(),
      lessons: course.lessons.map((l, i) => ({
        ...l,
        id: l.id || randomId(),
        order: l.order ?? i,
      })),
      createdAt: now,
      updatedAt: now,
    };
    courses.push(newCourse);
    saveCourses(courses);
    return newCourse;
  },

  update(id: string, updates: Partial<Omit<TeacherCourse, "id" | "createdAt">>): TeacherCourse | undefined {
    const courses = loadCourses();
    const idx = courses.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const existing = courses[idx];
    const updated: TeacherCourse = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      lessons: (updates.lessons ?? existing.lessons).map((l, i) => ({
        ...l,
        id: l.id || randomId(),
        order: l.order ?? i,
      })),
    };
    courses[idx] = updated;
    saveCourses(courses);
    return updated;
  },

  delete(id: string): boolean {
    const courses = loadCourses().filter((c) => c.id !== id);
    if (courses.length === loadCourses().length) return false;
    saveCourses(courses);
    return true;
  },

  upsertById(id: string, course: TeacherCourse): TeacherCourse {
    const courses = loadCourses();
    const idx = courses.findIndex((c) => c.id === id);
    const now = new Date().toISOString();
    if (idx === -1) {
      const created: TeacherCourse = {
        ...course,
        id,
        createdAt: course.createdAt || now,
        updatedAt: now,
      };
      courses.push(created);
      saveCourses(courses);
      return created;
    }
    const updated: TeacherCourse = {
      ...courses[idx],
      ...course,
      id,
      createdAt: courses[idx].createdAt,
      updatedAt: now,
    };
    courses[idx] = updated;
    saveCourses(courses);
    return updated;
  },
};

export function createEmptyLesson(order: number): TeacherLesson {
  return {
    id: randomId(),
    title: "",
    contentType: "video",
    contentUrl: "",
    order,
  };
}
