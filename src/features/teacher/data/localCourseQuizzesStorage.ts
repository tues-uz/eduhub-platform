/**
 * Browser-local course quizzes (placement / practice) per course — supplements the API when
 * list/create routes are missing or flaky. Same-origin only.
 */
import type { QuizCreateRequest, QuizQuestionResponse, QuizResponse } from "@/api/eduhubClient";

type Store = Record<string, QuizResponse[]>;

let memoryStore: Store = {};

function readStore(): Store {
  return memoryStore;
}

function writeStore(store: Store) {
  memoryStore = store;
}


function sortQuizzesDesc(list: QuizResponse[]): QuizResponse[] {
  return [...list].sort((a, b) => {
    const ta = Date.parse(a.updatedAt ?? a.createdAt ?? "") || 0;
    const tb = Date.parse(b.updatedAt ?? b.createdAt ?? "") || 0;
    return tb - ta;
  });
}

export function getLocalCourseQuizzes(courseId: string): QuizResponse[] {
  if (!courseId.trim()) return [];
  const list = readStore()[courseId.trim()];
  if (!Array.isArray(list)) return [];
  return sortQuizzesDesc(list.filter((q) => q && typeof q.id === "string" && typeof q.title === "string"));
}

export function getLocalCourseQuiz(courseId: string, quizId: string): QuizResponse | null {
  if (!courseId.trim() || !quizId.trim()) return null;
  return getLocalCourseQuizzes(courseId.trim()).find((q) => q.id === quizId.trim()) ?? null;
}

export function upsertLocalCourseQuiz(courseId: string, quiz: QuizResponse) {
  const cid = courseId.trim();
  if (!cid || !quiz.id) return;
  const store = readStore();
  const list = [...(store[cid] ?? [])];
  const idx = list.findIndex((q) => q.id === quiz.id);
  const normalized: QuizResponse = {
    ...quiz,
    courseId: quiz.courseId ?? cid,
    questions: Array.isArray(quiz.questions) ? quiz.questions : [],
  };
  if (idx >= 0) list[idx] = normalized;
  else list.push(normalized);
  store[cid] = sortQuizzesDesc(list);
  writeStore(store);
}

/** When the server cannot save, persist a full quiz shape for roster + edit-from-browser. */
export function buildClientOnlyQuizResponse(
  courseId: string,
  payload: QuizCreateRequest,
  existingId?: string,
): QuizResponse {
  const cid = courseId.trim();
  const rid =
    existingId?.trim() ||
    (typeof crypto !== "undefined" && crypto.randomUUID ? `local-${crypto.randomUUID()}` : `local-q-${Date.now()}`);
  const questions: QuizQuestionResponse[] = (payload.questions ?? []).map((q, qi) => ({
    id: `${rid}-question-${qi}`,
    question: q.question,
    ...(q.imageUrl ? { imageUrl: q.imageUrl } : {}),
    points: typeof q.points === "number" ? q.points : 1,
    options: (q.options ?? []).map((o) => ({
      letter: o.letter,
      text: o.text,
      isCorrect: Boolean(o.isCorrect),
    })),
  }));
  const now = new Date().toISOString();
  return {
    id: rid,
    courseId: cid,
    title: payload.title,
    ...(payload.description ? { description: payload.description } : {}),
    ...(payload.thumbnailUrl ? { thumbnailUrl: payload.thumbnailUrl } : {}),
    quizType: payload.quizType ?? "QUIZ",
    ...(payload.releaseDate ? { releaseDate: payload.releaseDate } : {}),
    ...(payload.releaseTime ? { releaseTime: payload.releaseTime } : {}),
    timeLimitMinutes: typeof payload.timeLimitMinutes === "number" ? payload.timeLimitMinutes : 0,
    passingScore: typeof payload.passingScore === "number" ? payload.passingScore : 0,
    isPublished: false,
    createdAt: now,
    updatedAt: now,
    questions,
  };
}

export function isLocalOnlyQuizId(quizId: string): boolean {
  return quizId.trim().startsWith("local-");
}

export function setLocalCourseQuizPublished(courseId: string, quizId: string, published: boolean) {
  const cid = courseId.trim();
  const qid = quizId.trim();
  if (!cid || !qid) return;
  const store = readStore();
  const list = store[cid];
  if (!Array.isArray(list)) return;
  const i = list.findIndex((q) => q.id === qid);
  if (i < 0) return;
  const now = new Date().toISOString();
  list[i] = { ...list[i], isPublished: published, updatedAt: now };
  store[cid] = [...list];
  writeStore(store);
}

/** Return API list sorted by update date; fallback to local storage only if offline/unauthenticated. */
export function mergeCourseQuizListsWithLocal(courseId: string, apiQuizzes: QuizResponse[]): QuizResponse[] {
  if (Array.isArray(apiQuizzes) && apiQuizzes.length > 0) {
    return sortQuizzesDesc(apiQuizzes.filter((q) => q && typeof q.id === "string"));
  }
  const local = getLocalCourseQuizzes(courseId);
  return sortQuizzesDesc(local);
}
