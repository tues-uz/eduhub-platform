import type { ReactNode } from "react";

function QuizListEmptyIllustration() {
  return (
    <svg
      fill="none"
      width="120"
      height="120"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto mb-3 text-zinc-300"
      aria-hidden
    >
      <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 4V6C9 7.10457 9.89543 8 11 8H13C14.1046 8 15 7.10457 15 6V4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="9"
        y1="12"
        x2="15"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="16"
        x2="13"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StudentQuizListEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[min(28rem,calc(100dvh-18rem))] w-full items-center justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-sm text-center">
        <QuizListEmptyIllustration />
        <p className="mb-2 text-base font-semibold tracking-tight text-zinc-900">{title}</p>
        <p className="mx-auto mb-6 max-w-[18rem] text-sm leading-relaxed text-zinc-500">{description}</p>
        {action}
      </div>
    </div>
  );
}
