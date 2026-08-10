import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "@/lib/icons";
import EduHubHeader from "@/components/EduHubHeader";
import Footer from "@/components/Footer";
import { appRoutes } from "@/app/routes";

const SECTION_CONTAINER = "container mx-auto max-w-[1400px] px-5 lg:px-6";

const INK = "#101012";
const CREAM = "#f2f1ec";
const LIME = "#c7ff3c";
const BLUE = "#3c55ff";
const ORANGE = "#ff6f3d";
const MUTED = "rgba(16, 16, 18, 0.65)";
const BORDER = "rgba(16, 16, 18, 0.16)";
const GLASS = "rgba(255, 255, 255, 0.38)";

const MANROPE = "'Manrope', sans-serif";
const DM_MONO = "'DM Mono', monospace";

const COLLAGE_IMAGES = [
  { src: "/eduhub/hero/1.png", className: "left-[12px] top-[120px] h-[300px] w-[267px] -rotate-[4deg] rounded-[120px_120px_16px_16px]" },
  { src: "/eduhub/hero/2.png", className: "left-[315px] top-[33px] h-[390px] w-[255px] rotate-[3deg] rounded-[18px]" },
  { src: "/eduhub/hero/3.png", className: "left-[580px] top-[125px] h-[315px] w-[267px] -rotate-[2deg] rounded-full" },
  { src: "/eduhub/hero/4.png", className: "right-[27px] top-[26px] h-[420px] w-[278px] rotate-[5deg] rounded-[18px_18px_130px]" },
] as const;

const PILLAR_BG = ["#f1efe9", ORANGE, BLUE] as const;

function GlassPill({
  children,
  dot = false,
  variant = "glass",
}: {
  children: React.ReactNode;
  dot?: boolean;
  variant?: "glass" | "soft";
}) {
  if (variant === "soft") {
    return (
      <span
        className="inline-flex w-fit items-center gap-2 rounded-[32px] px-4 py-1.5"
        style={{ backgroundColor: "rgb(240, 244, 243)" }}
      >
        {dot && (
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
        )}
        <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
          {children}
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex w-fit items-center gap-2.5 rounded-full border px-3.5 py-2.5 backdrop-blur-[10px]"
      style={{ borderColor: BORDER, backgroundColor: GLASS }}
    >
      {dot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: "rgb(27, 187, 101)" }}
        />
      )}
      <span className="text-[11px] uppercase tracking-[0.12em]" style={{ fontFamily: DM_MONO, color: INK }}>
        {children}
      </span>
    </span>
  );
}

function DirectionBlock({
  index,
  title,
  intro,
  items,
}: {
  index: string;
  title: string;
  intro: string;
  items: { label?: string; text: string }[];
}) {
  return (
    <article
      className="rounded-2xl p-6 sm:p-8 lg:p-10"
      style={{ backgroundColor: "rgb(240, 244, 243)" }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
        <div className="lg:w-[220px] lg:shrink-0">
          <p className="text-sm font-medium" style={{ fontFamily: DM_MONO, color: MUTED }}>
            {index}
          </p>
          <h3
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ fontFamily: MANROPE, color: INK }}
          >
            {title}
          </h3>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
            {intro}
          </p>
          <ul className="mt-5 space-y-3">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black">
                  <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                  {item.label ? (
                    <>
                      <strong>{item.label}:</strong> {item.text}
                    </>
                  ) : (
                    item.text
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export default function EduHubAboutPage() {
  const { t } = useTranslation();

  const tags = t("public.aboutPage.tags", { returnObjects: true }) as string[];
  const missionItems = t("public.vision.mission.items", { returnObjects: true }) as string[];
  const valuesItems = t("public.vision.values.items", { returnObjects: true }) as string[];
  const visionPoints = t("public.vision.visionContent", { returnObjects: true }) as {
    inspireTitle: string;
    inspireText: string;
    connectTitle: string;
    connectText: string;
    elevateTitle: string;
    elevateText: string;
  };

  const pillars = [
    { title: visionPoints.inspireTitle, text: visionPoints.inspireText },
    { title: visionPoints.connectTitle, text: visionPoints.connectText },
    { title: visionPoints.elevateTitle, text: visionPoints.elevateText },
  ];

  const collageBadgeLines = t("public.aboutPage.collageBadge").split("\n");

  return (
    <div className="min-h-screen" style={{ backgroundColor: CREAM, fontFamily: MANROPE, color: INK }}>
      <EduHubHeader />

      <main>
        {/* Hero — Monoshift editorial */}
        <section className="relative overflow-hidden bg-white pb-8 pt-[130px] lg:pb-[34px] lg:pt-[140px]">
          <div className={SECTION_CONTAINER}>
            <div className="flex max-w-[1400px] flex-col gap-[30px]">
              <GlassPill dot variant="soft">
                {t("public.aboutPage.badge")}
              </GlassPill>

              <h1
                className="flex w-full flex-col gap-2 sm:gap-3 text-[58px] font-bold leading-[0.95] tracking-[-0.075em] sm:text-[72px] lg:text-[84px] xl:text-[104px] xl:tracking-[-0.078em] 2xl:text-[124px]"
                style={{ fontFamily: MANROPE, color: INK }}
              >
                <span>{t("public.aboutPage.titleLine1")}</span>
                <span>{t("public.aboutPage.titleLine2")}</span>
              </h1>

              <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
                <p className="max-w-[590px] text-lg leading-[1.65]" style={{ color: INK }}>
                  {t("public.aboutPage.subtitle")}
                </p>
                <div className="flex flex-wrap items-center justify-start gap-2.5 lg:justify-end">
                  {tags.map((tag) => (
                    <GlassPill key={tag}>{tag}</GlassPill>
                  ))}
                </div>
              </div>
            </div>

            {/* Photo collage — desktop */}
            <div className="relative mx-auto mt-10 hidden h-[590px] max-w-[1160px] lg:block">
              {COLLAGE_IMAGES.map((item) => (
                <div
                  key={item.src}
                  className={`absolute overflow-hidden shadow-[0_26px_70px_rgba(16,16,18,0.18)] ${item.className}`}
                >
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
              <div
                className="absolute bottom-[108px] right-[346px] flex h-[170px] w-[170px] rotate-[8deg] items-center justify-center rounded-full shadow-[0_22px_60px_rgba(0,0,0,0.25)]"
                style={{ backgroundColor: LIME }}
              >
                <div
                  className="absolute inset-5 rounded-full border"
                  style={{ borderColor: INK }}
                />
                <p
                  className="relative text-center text-[13px] leading-[1.25]"
                  style={{ fontFamily: DM_MONO, color: INK }}
                >
                  {collageBadgeLines.map((line, i) => (
                    <span key={line}>
                      {line}
                      {i < collageBadgeLines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            </div>

            {/* Photo stack — mobile */}
            <div className="mt-10 flex flex-col items-center gap-3 lg:hidden">
              {COLLAGE_IMAGES.map((item, i) => (
                <div
                  key={item.src}
                  className="relative h-64 w-full max-w-sm overflow-hidden rounded-2xl shadow-[0_26px_70px_rgba(16,16,18,0.18)]"
                  style={{ transform: `rotate(${i % 2 === 0 ? -2 : 3}deg)` }}
                >
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Intro statement / 01 */}
        <section className="bg-white py-[90px] lg:py-[140px]">
          <div className={SECTION_CONTAINER}>
            <p
              className="text-[38px] font-bold leading-[1.08] tracking-[-0.045em] sm:text-[48px] lg:text-[60px]"
              style={{ fontFamily: MANROPE, color: INK }}
            >
                {t("public.aboutPage.statementBefore")}
                <span style={{ color: BLUE }}>{t("public.aboutPage.statementAccent")}</span>
                {t("public.aboutPage.statementAfter")}
            </p>
          </div>
        </section>

        {/* Story / 02 */}
        <section className="bg-white pb-[90px] lg:pb-[140px]">
          <div className={SECTION_CONTAINER}>
            <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <h2
                className="text-[42px] font-bold leading-[0.9] tracking-[-0.065em] sm:text-[57px] lg:text-[72px]"
                style={{ fontFamily: MANROPE, color: INK }}
              >
                {t("public.aboutPage.storyTitle")}
              </h2>
              <p className="max-w-md text-[12px] leading-none lg:text-right" style={{ fontFamily: DM_MONO, color: INK }}>
                TISU · EDUHUB
              </p>
            </div>

            <div className="grid gap-[18px] lg:grid-cols-[1.3fr_0.7fr]">
              <div className="group relative min-h-[360px] overflow-hidden rounded-2xl bg-[#ddd] lg:min-h-[660px]">
                <img
                  src="/eduhub/vision-community.png"
                  alt={t("public.vision.imageAlt")}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 p-6 sm:p-7"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 100%)",
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/90" style={{ fontFamily: DM_MONO }}>
                    {t("public.aboutPage.badge")}
                  </p>
                  <h3 className="mt-1 text-[32px] font-bold leading-[1.05] tracking-[-0.045em] text-white sm:text-[48px]" style={{ fontFamily: MANROPE }}>
                    {t("public.aboutPage.storyTitle")}
                  </h3>
                  <p className="mt-2 max-w-lg text-[13px] text-white/90">{t("public.aboutPage.storyBody1")}</p>
                </div>
                <div
                  className="absolute right-[18px] top-[18px] flex h-[88px] w-[88px] items-center justify-center rounded-full text-center text-[11px] font-medium leading-tight"
                  style={{ backgroundColor: LIME, fontFamily: DM_MONO, color: INK }}
                >
                  EDUHUB
                </div>
              </div>

              <div className="group relative min-h-[360px] overflow-hidden rounded-2xl bg-[#ddd] lg:min-h-[660px]">
                <img
                  src="/eduhub/hero/2.png"
                  alt={t("public.vision.imageAlt")}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div
                  className="absolute bottom-0 left-0 right-0 p-6 sm:p-7"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 100%)",
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/90" style={{ fontFamily: DM_MONO }}>
                    {t("public.programPages.badge")}
                  </p>
                  <h3 className="mt-1 text-[32px] font-bold leading-[1.05] tracking-[-0.045em] text-white sm:text-[48px]" style={{ fontFamily: MANROPE }}>
                    {t("nav.languageTraining")}
                  </h3>
                  <Link
                    to={appRoutes.programsLanguageTraining}
                    className="mt-2 inline-block text-[13px] text-white/70 transition-colors hover:text-white"
                  >
                    {t("public.hero.learnMore")} ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & direction / 03 */}
        <section className="bg-white py-[90px] lg:py-[140px]">
          <div className={SECTION_CONTAINER}>
            <div className="max-w-3xl">
              <h2
                className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                style={{ fontFamily: MANROPE, color: INK }}
              >
                {t("public.vision.title").replace(/<br\s*\/?>/gi, " ")}
              </h2>
            </div>

            <div className="mt-12 flex flex-col gap-6 lg:mt-14 lg:gap-8">
              <DirectionBlock
                index="01"
                title={t("public.vision.tabs.mission")}
                intro={t("public.vision.mission.intro")}
                items={missionItems.map((text) => ({ text }))}
              />
              <DirectionBlock
                index="02"
                title={t("public.vision.tabs.vision")}
                intro={t("public.vision.visionContent.intro")}
                items={pillars.map((pillar) => ({ label: pillar.title, text: pillar.text }))}
              />
              <DirectionBlock
                index="03"
                title={t("public.vision.tabs.values")}
                intro={t("public.vision.values.intro")}
                items={valuesItems.map((text) => ({ text }))}
              />
            </div>

            <div className="mt-12">
              <Link
                to={appRoutes.programsLanguageTraining}
                className="inline-flex items-center gap-2 rounded-full border px-5 py-3.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ borderColor: INK, backgroundColor: LIME, fontFamily: MANROPE, color: INK }}
              >
                {t("nav.languageTraining")} ↗
              </Link>
            </div>
          </div>
        </section>

        {/* Pillars / 04 */}
        <section className="bg-white py-[90px] lg:py-[140px]">
          <div className={SECTION_CONTAINER}>
            <h2
              className="max-w-[1080px] text-[42px] font-bold leading-[0.9] tracking-[-0.065em] sm:text-[57px] lg:text-[72px]"
              style={{ fontFamily: MANROPE, color: INK }}
            >
              {t("public.vision.visionContent.intro")}
            </h2>

            <div className="mt-[60px] grid gap-4 lg:grid-cols-3">
              {pillars.map((pillar, index) => (
                <article
                  key={pillar.title}
                  className="flex min-h-[480px] flex-col justify-between overflow-hidden rounded-2xl p-7"
                  style={{ backgroundColor: PILLAR_BG[index % PILLAR_BG.length] }}
                >
                  <div>
                    <h3
                      className="text-[42px] font-bold leading-none tracking-[-0.05em]"
                      style={{ fontFamily: MANROPE, color: index === 2 ? "#fff" : INK }}
                    >
                      {pillar.title}
                    </h3>
                    <p
                      className="mt-4 text-[15px] leading-relaxed"
                      style={{ color: index === 2 ? "rgba(255,255,255,0.85)" : MUTED }}
                    >
                      {pillar.text}
                    </p>
                  </div>
                  <div
                    className="mt-8 h-[230px] overflow-hidden rounded-[999px_999px_12px_12px]"
                    style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                  >
                    <img
                      src={`/eduhub/hero/${(index % 4) + 1}.png`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA / 05 — dark card with orb */}
        <section className="bg-white py-10 lg:py-14" id="contact">
          <div className={SECTION_CONTAINER}>
            <div
              className="relative flex min-h-[480px] flex-col justify-between overflow-hidden rounded-2xl p-7 sm:p-12 lg:min-h-[520px]"
              style={{ backgroundColor: INK }}
            >
              <div
                className="pointer-events-none absolute -bottom-[170px] -right-[120px] h-[540px] w-[540px] rounded-full opacity-90"
                style={{
                  background: `radial-gradient(50% 50% at 30% 30%, #ff9ae9 0%, ${BLUE} 45%, #111 75%)`,
                }}
              />

              <p className="relative z-[2] text-[11px] uppercase tracking-[0.12em]" style={{ fontFamily: DM_MONO, color: "#aaa" }}>
                {t("public.aboutPage.ctaAvailable")}
              </p>

              <h2
                className="relative z-[2] max-w-[1100px] text-[48px] font-bold leading-[0.9] tracking-[-0.075em] sm:text-[72px] lg:text-[110px]"
                style={{ fontFamily: MANROPE, color: CREAM }}
              >
                {t("public.aboutPage.ctaTitle")}
              </h2>

              <div className="relative z-[2] flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <p className="max-w-[520px] text-lg leading-[1.7]" style={{ color: "#aaa" }}>
                  {t("public.aboutPage.ctaBody")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={appRoutes.register}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: "#199eff", fontFamily: MANROPE }}
                  >
                    {t("public.aboutPage.ctaButton")}
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: "rgb(253, 253, 251)" }}
                    >
                      <ArrowRight className="h-4 w-4" style={{ color: "rgb(38, 41, 46)" }} />
                    </span>
                  </Link>
                  <Link
                    to={appRoutes.programsLanguageTraining}
                    className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-base font-medium transition-colors hover:bg-white/10"
                    style={{
                      borderColor: "rgba(255, 255, 255, 0.35)",
                      color: "#fff",
                      fontFamily: MANROPE,
                    }}
                  >
                    {t("nav.languageTraining")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
