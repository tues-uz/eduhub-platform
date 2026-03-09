export type QuizOption = { letter: "A" | "B" | "C" | "D"; text: string; correct: boolean };
export type QuizQuestion = { id: string; question: string; image?: string; timeLimitSeconds?: number; options: QuizOption[] };
export type QuizType = "quiz" | "placement-test";
export type Quiz = { id: string; title: string; courseId?: string; quizType?: QuizType; releaseDate?: string; releaseTime?: string; questions: QuizQuestion[] };

export const QUIZ_TYPE_OPTIONS: { value: QuizType; label: string }[] = [
  { value: "quiz", label: "Quiz" },
  { value: "placement-test", label: "Placement test" },
];

export const TIME_LIMIT_OPTIONS = [10, 20, 30, 40, 50, 60] as const;

export const LETTERS: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

export function createEmptyOption(letter: "A" | "B" | "C" | "D"): QuizOption {
  return { letter, text: "", correct: false };
}

export function createEmptyQuestion(id: string): QuizQuestion {
  return {
    id,
    question: "",
    options: LETTERS.map((letter) => createEmptyOption(letter)),
  };
}
