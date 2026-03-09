import type { Quiz } from "../quizTypes";

const STORAGE_KEY = "eduhub_teacher_quizzes";

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Quiz[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQuizzes(quizzes: Quiz[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
}

export const teacherQuizStore = {
  getAll(): Quiz[] {
    return loadQuizzes();
  },

  getById(id: string): Quiz | undefined {
    return loadQuizzes().find((q) => q.id === id);
  },

  create(quiz: Omit<Quiz, "id">): Quiz {
    const quizzes = loadQuizzes();
    const newQuiz: Quiz = {
      ...quiz,
      id: randomId(),
      questions: quiz.questions.map((q) => ({
        ...q,
        id: q.id || randomId(),
      })),
    };
    quizzes.push(newQuiz);
    saveQuizzes(quizzes);
    return newQuiz;
  },

  update(id: string, updates: Partial<Omit<Quiz, "id">>): Quiz | undefined {
    const quizzes = loadQuizzes();
    const index = quizzes.findIndex((q) => q.id === id);
    if (index === -1) return undefined;
    quizzes[index] = { ...quizzes[index], ...updates, id };
    saveQuizzes(quizzes);
    return quizzes[index];
  },

  delete(id: string): void {
    saveQuizzes(loadQuizzes().filter((q) => q.id !== id));
  },
};
