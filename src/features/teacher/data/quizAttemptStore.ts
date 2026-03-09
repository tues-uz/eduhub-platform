export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
}

const STORAGE_KEY = "eduhub_quiz_attempts";

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadAttempts(): QuizAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuizAttempt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAttempts(attempts: QuizAttempt[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
}

export const quizAttemptStore = {
  add(
    quizId: string,
    studentId: string,
    studentName: string,
    correctCount: number,
    totalQuestions: number,
    studentEmail?: string
  ): QuizAttempt {
    const attempts = loadAttempts();
    const scorePercent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const attempt: QuizAttempt = {
      id: randomId(),
      quizId,
      studentId,
      studentName,
      studentEmail,
      scorePercent,
      correctCount,
      totalQuestions,
      completedAt: new Date().toISOString(),
    };
    attempts.push(attempt);
    saveAttempts(attempts);
    return attempt;
  },

  getByQuizId(quizId: string): QuizAttempt[] {
    return loadAttempts()
      .filter((a) => a.quizId === quizId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  },

  getAll(): QuizAttempt[] {
    return loadAttempts().sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  },
};
