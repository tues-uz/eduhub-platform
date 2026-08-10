import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, GraduationCap, Target, Users, Award } from "@/lib/icons";
import EduHubHeader from "@/components/EduHubHeader";
import Footer from "@/components/Footer";
import { appRoutes } from "@/app/routes";

export type EduHubProgramVariant = "languageTraining" | "academicServices";

type EduHubProgramPageProps = {
  variant: EduHubProgramVariant;
};

const PROGRAM_META: Record<
  EduHubProgramVariant,
  { image: string; imageAltKey: string; icon: typeof BookOpen }
> = {
  languageTraining: {
    image: "/eduhub/hero/3.png",
    imageAltKey: "public.programPages.languageTraining.title",
    icon: BookOpen,
  },
  academicServices: {
    image: "/eduhub/vision-community.png",
    imageAltKey: "public.programPages.academicServices.title",
    icon: GraduationCap,
  },
};

const HIGHLIGHT_ICONS = [BookOpen, Users, Award, Target] as const;

const PROGRAM_SECTION_CONTAINER = "container mx-auto px-6 lg:px-20";

function cardIndexLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export default function EduHubProgramPage({ variant }: EduHubProgramPageProps) {
  const { t } = useTranslation();
  const highlights = t(`public.programPages.${variant}.highlights`, { returnObjects: true }) as string[];
  const meta = PROGRAM_META[variant];
  const Icon = meta.icon;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <EduHubHeader />

      <main>
        {/* Hero — matches home page pill badge + typography */}
        <section className="relative overflow-hidden bg-white pb-12 pt-[120px] lg:pb-16 lg:pt-[140px]">
          <div className={PROGRAM_SECTION_CONTAINER}>
            <div className="mx-auto max-w-4xl text-center">
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5"
                style={{ backgroundColor: "rgb(240, 244, 243)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-90"
                    style={{ backgroundColor: "rgb(94, 107, 100)", transform: "scale(1.9)" }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: "rgb(19, 38, 27)" }}
                  />
                </span>
                <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                  {t("public.programPages.badge")}
                </span>
              </div>

              <h1
                className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)", lineHeight: "1.08" }}
              >
                {t(`public.programPages.${variant}.title`)}
              </h1>

              <p
                className="mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg"
                style={{ color: "rgb(88, 88, 102)" }}
              >
                {t(`public.programPages.${variant}.subtitle`)}
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[24px]">
              <div className="aspect-[21/9] w-full overflow-hidden bg-gray-100 sm:aspect-[2.4/1]">
                <img
                  src={meta.image}
                  alt={t(meta.imageAltKey)}
                  className="h-full w-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Overview — reviews-style bento (12-col, all white cards) */}
        <section className="relative bg-white py-20">
          <div className={PROGRAM_SECTION_CONTAINER}>
            <div className="mb-12">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5"
                style={{ backgroundColor: "rgb(240, 244, 243)" }}
              >
                <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                  {t(`public.programPages.${variant}.overviewTitle`)}
                </span>
              </div>

              <div className="flex w-full flex-col gap-6 text-left lg:flex-row lg:items-end lg:gap-16">
                <h2
                  className="flex-shrink-0 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
                >
                  {t(`public.programPages.${variant}.audienceTitle`)}
                </h2>
                <p
                  className="max-w-2xl text-base leading-relaxed lg:ml-auto lg:text-right"
                  style={{ color: "rgb(88, 88, 102)" }}
                >
                  {t(`public.programPages.${variant}.overviewBody`)}
                </p>
              </div>
            </div>

            <div className="rounded-[16px] p-2" style={{ backgroundColor: "rgb(249, 250, 251)" }}>
              <div className="grid gap-2 lg:grid-cols-12">
                {/* Featured — audience (mirrors home featured review card) */}
                <article className="flex min-h-[320px] flex-col justify-between rounded-[20px] bg-white p-6 sm:p-8 lg:col-span-7 lg:row-span-2 lg:min-h-[420px] lg:p-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="inline-flex items-center rounded-[32px] px-3 py-1 text-xs font-medium"
                        style={{ backgroundColor: "rgb(240, 244, 243)", color: "rgb(19, 38, 27)" }}
                      >
                        {t(`public.programPages.${variant}.audienceTitle`)}
                      </span>
                      <div
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px]"
                        style={{ backgroundColor: "rgb(245, 248, 255)" }}
                      >
                        <Icon className="h-4 w-4" style={{ color: "rgb(18, 18, 18)" }} />
                      </div>
                    </div>
                    <p
                      className="mt-6 text-xl font-medium leading-snug sm:text-2xl lg:text-[1.65rem] lg:leading-[1.35]"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
                    >
                      {t(`public.programPages.${variant}.audienceBody`)}
                    </p>
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-4">
                    <p className="max-w-md text-sm leading-relaxed" style={{ color: "rgb(88, 88, 102)" }}>
                      {t(`public.programPages.${variant}.subtitle`)}
                    </p>
                    <span
                      className="select-none text-5xl font-bold leading-none sm:text-6xl"
                      style={{ color: "rgb(238, 238, 238)", fontFamily: "'DM Sans', sans-serif" }}
                      aria-hidden
                    >
                      {cardIndexLabel(0)}
                    </span>
                  </div>
                </article>

                {/* Top-right stack — first two highlights */}
                {highlights.slice(0, 2).map((item, index) => {
                  const HighlightIcon = HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length];
                  return (
                    <article
                      key={item}
                      className="flex min-h-[200px] flex-col rounded-[20px] bg-white p-5 sm:p-6 lg:col-span-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                          style={{ backgroundColor: "rgb(238, 238, 238)", color: "rgb(109, 109, 109)" }}
                        >
                          {cardIndexLabel(index + 1)}
                        </div>
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]"
                          style={{ backgroundColor: "rgb(245, 248, 255)" }}
                        >
                          <HighlightIcon className="h-4 w-4" style={{ color: "rgb(18, 18, 18)" }} />
                        </div>
                      </div>
                      <p className="mt-4 flex-1 text-sm leading-relaxed sm:text-[15px]" style={{ color: "rgb(75, 85, 84)" }}>
                        {item}
                      </p>
                    </article>
                  );
                })}

                {/* Bottom row — remaining highlights */}
                {highlights.slice(2).map((item, index) => {
                  const highlightIndex = index + 3;
                  const HighlightIcon = HIGHLIGHT_ICONS[highlightIndex % HIGHLIGHT_ICONS.length];
                  return (
                    <article
                      key={item}
                      className="flex min-h-[200px] flex-col rounded-[20px] bg-white p-5 sm:p-6 lg:col-span-6"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                          style={{ backgroundColor: "rgb(238, 238, 238)", color: "rgb(109, 109, 109)" }}
                        >
                          {cardIndexLabel(highlightIndex)}
                        </div>
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]"
                          style={{ backgroundColor: "rgb(245, 248, 255)" }}
                        >
                          <HighlightIcon className="h-4 w-4" style={{ color: "rgb(18, 18, 18)" }} />
                        </div>
                      </div>
                      <p className="mt-4 flex-1 text-sm leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                        {item}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA — stats bento style (blue + gray, matches home) */}
        <section className="relative bg-white py-20 lg:py-24">
          <div className={PROGRAM_SECTION_CONTAINER}>
            <div className="mb-8 text-center lg:mb-10">
              <div
                className="mb-4 inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5"
                style={{ backgroundColor: "rgb(240, 244, 243)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-90"
                    style={{ backgroundColor: "rgb(94, 107, 100)", transform: "scale(1.9)" }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: "rgb(19, 38, 27)" }}
                  />
                </span>
                <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                  {t("public.programPages.badge")}
                </span>
              </div>
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
              >
                {t("public.programPages.nextStepTitle")}
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="flex min-h-[260px] flex-col justify-between rounded-[16px] bg-blue-500 p-6 sm:p-8 lg:col-span-3 lg:min-h-[280px] lg:p-10">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-white/75">
                    {t(`public.programPages.${variant}.title`)}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg">
                    {t("public.programPages.nextStepBody")}
                  </p>
                  <ul className="mt-6 space-y-2">
                    {highlights.slice(0, 2).map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/90" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to={appRoutes.register}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[37px] bg-white px-6 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90 sm:w-fit"
                  style={{ color: "#3954d0" }}
                >
                  {t("public.programPages.register")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div
                className="flex min-h-[220px] flex-col justify-between rounded-[16px] p-6 sm:p-8 lg:col-span-2 lg:min-h-[280px]"
                style={{ backgroundColor: "rgb(242, 241, 241)" }}
              >
                <div>
                  <div
                    className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-[12px]"
                    style={{ backgroundColor: "rgb(255, 255, 255)" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: "rgb(38, 41, 46)" }} />
                  </div>
                  <h3
                    className="text-xl font-bold sm:text-2xl"
                    style={{ color: "rgb(38, 41, 46)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {t("public.programPages.aboutLink")}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgb(102, 112, 122)" }}>
                    {t(`public.programPages.${variant}.subtitle`)}
                  </p>
                </div>
                <Link
                  to={appRoutes.about}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[37px] border border-[rgb(220,220,220)] bg-white px-6 py-3 text-sm font-semibold transition-colors hover:bg-gray-50 sm:w-fit"
                  style={{ color: "rgb(38, 41, 46)" }}
                >
                  {t("public.programPages.aboutLink")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
