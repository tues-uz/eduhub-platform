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

const memoryAttempts: QuizAttempt[] = [];

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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
    memoryAttempts.push(attempt);
    return attempt;
  },

  getByQuizId(quizId: string): QuizAttempt[] {
    return [...memoryAttempts]
      .filter((a) => a.quizId === quizId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  },

  getAll(): QuizAttempt[] {
    return [...memoryAttempts].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  },
};

