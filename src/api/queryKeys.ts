export const studentKeys = {
  all: ["student"] as const,
  overview: () => [...studentKeys.all, "overview"] as const,
  courses: () => [...studentKeys.all, "courses"] as const,
};

export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
};
