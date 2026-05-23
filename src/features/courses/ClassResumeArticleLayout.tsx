import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, GraduationCap } from "@/lib/icons";
import type { ClassResumeItem } from "@/features/courses/classResumeStorage";
import { cn } from "@/lib/utils";

const FONT_BODY = "'Source Serif 4', Georgia, 'Times New Roman', serif";
const FONT_UI = "'DM Sans', system-ui, sans-serif";

function splitParagraphs(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  const blocks = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return blocks.length > 0 ? blocks : [trimmed];
}

function formatPublished(iso?: string): { long: string; short: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    long: d.toLocaleString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    short: d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

type ClassResumeArticleLayoutProps = {
  resume: ClassResumeItem;
  courseTitle: string;
  backHref: string;
};

export function ClassResumeArticleLayout({
  resume,
  courseTitle,
  backHref,
}: ClassResumeArticleLayoutProps) {
  const title = resume.sessionLabel ?? "General recap";
  const paragraphs = splitParagraphs(resume.body);
  const published = formatPublished(resume.updatedAt);
  const imageUrl = resume.thumbnailUrl?.trim();

  return (
    <div
      className="flex min-h-full flex-1 flex-col bg-white"
      style={{ fontFamily: FONT_UI }}
    >
      <header className="sticky top-0 z-20 shrink-0 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-6xl items-center px-5 sm:px-8">
          <Link
            to={backHref}
            className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{courseTitle}</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-14 lg:py-12 xl:grid-cols-[minmax(0,1fr)_260px] xl:gap-20">
        <article className="min-w-0 max-w-[42rem] lg:max-w-none">
          <p className="text-sm font-medium text-[#3954d0]">Class recap</p>

          <h1 className="mt-3 text-[2rem] font-bold leading-[1.2] tracking-tight text-zinc-950 sm:text-[2.5rem] sm:leading-[1.15]">
            {title}
          </h1>

          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 lg:hidden">
            <span className="font-medium text-zinc-700">{courseTitle}</span>
            {published ? (
              <>
                <span className="text-zinc-300" aria-hidden>
                  ·
                </span>
                <time dateTime={resume.updatedAt}>{published.long}</time>
              </>
            ) : null}
          </p>

          {imageUrl ? (
            <figure className="mt-8 sm:mt-10">
              <img
                src={imageUrl}
                alt=""
                className="w-full rounded-xl border border-zinc-200/80 object-cover shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]"
                loading="lazy"
              />
            </figure>
          ) : null}

          <div
            className={cn(
              "space-y-5 sm:space-y-6",
              imageUrl ? "mt-8 sm:mt-10" : "mt-8 border-t border-zinc-100 pt-8 sm:mt-10 sm:pt-10",
            )}
          >
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-[1.125rem] leading-[1.75] text-zinc-800 sm:text-[1.1875rem] sm:leading-[1.8]"
                  style={{ fontFamily: FONT_BODY }}
                >
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-lg italic text-zinc-400" style={{ fontFamily: FONT_BODY }}>
                No recap text yet.
              </p>
            )}
          </div>

          <footer className="mt-12 border-t border-zinc-100 pt-8 sm:mt-14">
            <Link
              to={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#3954d0] hover:text-[#2f47b3]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              All recaps for this class
            </Link>
          </footer>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-8 border-l border-zinc-100 pl-8">
            <MetaBlock icon={GraduationCap} label="Course">
              <p className="font-medium leading-snug text-zinc-900">{courseTitle}</p>
            </MetaBlock>

            {published ? (
              <MetaBlock icon={Calendar} label="Published">
                <time dateTime={resume.updatedAt} className="font-medium text-zinc-900">
                  {published.long}
                </time>
              </MetaBlock>
            ) : null}

            <MetaBlock icon={null} label="About">
              <p className="leading-relaxed text-zinc-600">
                Your instructor wrote this recap to help you review what happened in class.
              </p>
            </MetaBlock>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetaBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof GraduationCap | null;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}
