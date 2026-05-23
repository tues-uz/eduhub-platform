export const studentKeys = {
  all: ["student"] as const,
  overview: () => [...studentKeys.all, "overview"] as const,
  courses: () => [...studentKeys.all, "courses"] as const,
  upcomingSchedule: () => [...studentKeys.all, "upcomingSchedule"] as const,
  courseScheduleSummary: (courseId: string) =>
    [...studentKeys.all, "courseScheduleSummary", courseId] as const,
};

export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
};
