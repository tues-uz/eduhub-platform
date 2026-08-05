import type { Quiz } from "../quizTypes";

let memoryQuizzes: Quiz[] = [];

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const teacherQuizStore = {
  getAll(): Quiz[] {
    return [...memoryQuizzes];
  },

  getById(id: string): Quiz | undefined {
    return memoryQuizzes.find((q) => q.id === id);
  },

  create(quiz: Omit<Quiz, "id">): Quiz {
    const newQuiz: Quiz = {
      ...quiz,
      id: randomId(),
      questions: quiz.questions.map((q) => ({
        ...q,
        id: q.id || randomId(),
      })),
    };
    memoryQuizzes.push(newQuiz);
    return newQuiz;
  },

  update(id: string, updates: Partial<Omit<Quiz, "id">>): Quiz | undefined {
    const index = memoryQuizzes.findIndex((q) => q.id === id);
    if (index === -1) return undefined;
    memoryQuizzes[index] = { ...memoryQuizzes[index], ...updates, id };
    return memoryQuizzes[index];
  },

  delete(id: string): void {
    memoryQuizzes = memoryQuizzes.filter((q) => q.id !== id);
  },
};

