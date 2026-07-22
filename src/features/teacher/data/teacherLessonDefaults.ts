import type { TeacherLesson } from "../types";

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createEmptyLesson(order: number): TeacherLesson {
  return {
    id: randomId(),
    title: "",
    contentType: "video",
    contentUrl: "",
    order,
  };
}
