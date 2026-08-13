import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookOpen, Users, Award, GraduationCap, Target, ChevronUp, ArrowRight, Linkedin, Check, Star, PlayCircle, Megaphone, MapPin, Telegram } from "@/lib/icons";
import { cn } from "@/lib/utils";
import EduHubHeader from "@/components/EduHubHeader";
import { HeroInfiniteScrollGallery } from "@/components/HeroInfiniteScrollGallery";
import Footer from "@/components/Footer";
import { LandingAvailableClassesSection } from "@/features/landing/LandingAvailableClassesSection";
import { useLandingPageContent } from "@/features/landing/useLandingPageContent";
import { appRoutes } from "@/app/routes";

gsap.registerPlugin(ScrollTrigger);

const FEATURE_KEYS = [
  "onlineClasses",
  "expertInstructors",
  "certifications",
  "careerGrowth",
  "globalAccess",
  "analyticsDashboard",
] as const;

const FEATURE_IMAGE_PARAMS = "auto=format&fit=crop&w=600&h=450&q=80";

const EDUHUB_TELEGRAM_URL = "https://t.me/eduhub_tisu_admin";

const FEATURE_IMAGES: Record<(typeof FEATURE_KEYS)[number], string> = {
  onlineClasses: `https://images.unsplash.com/photo-1509062522246-3755977927d7?${FEATURE_IMAGE_PARAMS}`,
  expertInstructors: `https://images.unsplash.com/photo-1529390079861-591de354faf5?${FEATURE_IMAGE_PARAMS}`,
  certifications: `https://images.unsplash.com/photo-1460925895917-afdab827c52f?${FEATURE_IMAGE_PARAMS}`,
  careerGrowth: `https://images.unsplash.com/photo-1529156069898-49953e39b3ac?${FEATURE_IMAGE_PARAMS}`,
  globalAccess: `https://images.unsplash.com/photo-1434030216411-0b793f4b4173?${FEATURE_IMAGE_PARAMS}`,
  analyticsDashboard: `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?${FEATURE_IMAGE_PARAMS}`,
};

const HIGHLIGHT_KEYS = ["movieNight", "speakingClub", "debateClub", "fieldTrip"] as const;

const HIGHLIGHT_ICONS = {
  movieNight: PlayCircle,
  speakingClub: Megaphone,
  debateClub: Award,
  fieldTrip: MapPin,
} as const;

const HIGHLIGHT_GRADIENTS = {
  movieNight: "from-violet-500 to-purple-500",
  speakingClub: "from-cyan-500 to-blue-500",
  debateClub: "from-amber-500 to-orange-500",
  fieldTrip: "from-emerald-500 to-teal-500",
} as const;

const TEAM_MEMBERS = [
  { name: "Buriyeva Shakhnoza", nameLine1: "Buriyeva", nameLine2: "Shakhnoza", roleKey: "director", image: "/eduhub/1.png" },
  { name: "Indiana Ayu Alwasilah", nameLine1: "Indiana Ayu", nameLine2: "Alwasilah", roleKey: "coExecutiveDirector", image: "/eduhub/2.png" },
  { name: "Riyadi Maulaya", nameLine1: "Riyadi", nameLine2: "Maulaya", roleKey: "coExecutiveDirector", image: "/eduhub/3.png" },
  { name: "Saidakhmedova Dilfuzakhon", nameLine1: "Saidakhmedova", nameLine2: "Dilfuzakhon", roleKey: "orgExcellenceManager", image: "/eduhub/4.png" },
  { name: "Abdurazakova Samira", nameLine1: "Abdurazakova", nameLine2: "Samira", roleKey: "learningExperienceManager", image: "/eduhub/5.png" },
  { name: "Jurakulova Yulduz", nameLine1: "Jurakulova", nameLine2: "Yulduz", roleKey: "callOperator", image: "/eduhub/6.png" },
  { name: "Tursunova Yuliroz", nameLine1: "Tursunova", nameLine2: "Yuliroz", roleKey: "adminNavigator", image: "/eduhub/7.png" },
  { name: "Sardor Khusanovich", nameLine1: "Sardor", nameLine2: "Khusanovich", roleKey: "learningSupportOfficer", image: "/eduhub/8.png" },
] as const;

type TeamRoleKey = (typeof TEAM_MEMBERS)[number]["roleKey"];

const ROLE_LINE_KEYS: Record<TeamRoleKey, { line1: string; line2: string }> = {
  director: { line1: "directorLine1", line2: "directorLine2" },
  coExecutiveDirector: { line1: "coExecutiveLine1", line2: "coExecutiveLine2" },
  orgExcellenceManager: { line1: "orgExcellenceLine1", line2: "orgExcellenceLine2" },
  learningExperienceManager: { line1: "learningExperienceLine1", line2: "learningExperienceLine2" },
  callOperator: { line1: "callOperatorLine1", line2: "callOperatorLine2" },
  learningSupportOfficer: { line1: "learningSupportOfficerLine1", line2: "learningSupportOfficerLine2" },
  adminNavigator: { line1: "adminNavigatorLine1", line2: "adminNavigatorLine2" },
};

const REVIEW_KEYS = ["aziza", "jasur", "madina", "bobur", "nilufar", "sardor"] as const;

const REVIEW_META: Record<(typeof REVIEW_KEYS)[number], { name: string; rating: number; featured?: boolean }> = {
  aziza: { name: "Aziza Karimova", rating: 5 },
  jasur: { name: "Jasur Toshmatov", rating: 5 },
  madina: { name: "Madina Rakhimova", rating: 5, featured: true },
  bobur: { name: "Bobur Nazarov", rating: 4 },
  nilufar: { name: "Nilufar Yusupova", rating: 5 },
  sardor: { name: "Sardor Alimov", rating: 5 },
};


import {
  BLOG_IMAGES,
  BLOG_POST_KEYS,
  blogArticlePath,
  blogPostHasArticlePage,
} from "@/features/landing/blogPosts";

function reviewIndexLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function ReviewStars({
  rating,
  size = "sm",
  className,
  starsLabel,
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
  starsLabel: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={starsLabel}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            size === "md" ? "h-4 w-4" : "h-3 w-3",
            index < rating ? "fill-amber-400 text-amber-400" : "text-gray-300",
          )}
          strokeWidth={index < rating ? 0 : 1.5}
          aria-hidden
        />
      ))}
    </div>
  );
}

const PARTNER_LOGOS = [
  { name: "Oxford University Press", logo: "/partnership/1.png" },
  { name: "IELTS", logo: "/partnership/2.png" },
  { name: "University of Cambridge", logo: "/partnership/3.png" },
  { name: "British Council", logo: "/partnership/4.png" },
  { name: "Bloomberg", logo: "/partnership/bloomberg.png" },
] as const;

const EduHub = () => {
  const { t } = useTranslation();
  const landingContent = useLandingPageContent();
  const words =
    landingContent?.hero.words ??
    (t("public.hero.words", { returnObjects: true }) as string[]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visionTab, setVisionTab] = useState<"mission" | "vision" | "values">("mission");
  const rootRef = useRef<HTMLDivElement>(null);

  const features = useMemo(
    () =>
      FEATURE_KEYS.map((key) => ({
        key,
        title: t(`public.features.items.${key}.title`),
        description: t(`public.features.items.${key}.description`),
        image: FEATURE_IMAGES[key],
        imageAlt: t(`public.features.items.${key}.imageAlt`),
      })),
    [t],
  );

  const stats = useMemo(
    () => [
      {
        icon: GraduationCap,
        value: landingContent?.stats.students ?? "300+",
        label: t("public.stats.students"),
        color: "text-blue-500",
        bento: "wide" as const,
      },
      {
        icon: BookOpen,
        value: landingContent?.stats.classes ?? "20+",
        label: t("public.stats.classes"),
        color: "text-purple-500",
        bento: "normal" as const,
      },
      {
        icon: Users,
        value: landingContent?.stats.teachers ?? "100+",
        label: t("public.stats.teachers"),
        color: "text-green-500",
        bento: "normal" as const,
      },
      {
        icon: Award,
        value: landingContent?.stats.completionRate ?? "15+",
        label: t("public.stats.completionRate"),
        color: "text-orange-500",
        bento: "accent" as const,
      },
      {
        icon: Target,
        value: landingContent?.stats.yearsExcellence ?? "3",
        label: t("public.stats.yearsExcellence"),
        color: "text-amber-600",
        bento: "normal" as const,
      },
    ],
    [t, landingContent],
  );

  const statTags = useMemo(
    () => ({
      row1: ["language", "business", "tech", "arts", "science"] as const,
      row2: ["math", "science", "language", "business", "tech"] as const,
    }),
    [],
  );

  const highlights = useMemo(
    () =>
      HIGHLIGHT_KEYS.map((key) => ({
        key,
        icon: HIGHLIGHT_ICONS[key],
        title: t(`public.highlights.items.${key}.title`),
        description: t(`public.highlights.items.${key}.description`),
        gradient: HIGHLIGHT_GRADIENTS[key],
      })),
    [t],
  );

  const teamMembers = useMemo(
    () =>
      TEAM_MEMBERS.map((member) => {
        const lineKeys = ROLE_LINE_KEYS[member.roleKey];
        return {
          ...member,
          roleLine1: t(`public.team.roles.${lineKeys.line1}`),
          roleLine2: t(`public.team.roles.${lineKeys.line2}`),
        };
      }),
    [t],
  );

  const studentReviews = useMemo(
    () =>
      REVIEW_KEYS.map((key) => ({
        key,
        name: REVIEW_META[key].name,
        rating: REVIEW_META[key].rating,
        featured: REVIEW_META[key].featured,
        course: t(`public.reviews.items.${key}.course`),
        quote: t(`public.reviews.items.${key}.quote`),
      })),
    [t],
  );

  const featuredReview = studentReviews.find((review) => review.featured) ?? studentReviews[0];
  const supportingReviews = studentReviews.filter((review) => review !== featuredReview);

  const missionItems = t("public.vision.mission.items", { returnObjects: true }) as string[];
  const valuesItems = t("public.vision.values.items", { returnObjects: true }) as string[];

  const visionPoints = useMemo(
    () => [
      { title: t("public.vision.visionContent.inspireTitle"), text: t("public.vision.visionContent.inspireText") },
      { title: t("public.vision.visionContent.connectTitle"), text: t("public.vision.visionContent.connectText") },
      { title: t("public.vision.visionContent.elevateTitle"), text: t("public.vision.visionContent.elevateText") },
    ],
    [t],
  );

  const blogPosts = useMemo(
    () =>
      BLOG_POST_KEYS.map((key) => ({
        key,
        title: t(`public.blog.posts.${key}.title`),
        description: t(`public.blog.posts.${key}.description`),
        imageAlt: t(`public.blog.posts.${key}.imageAlt`),
        image: BLOG_IMAGES[key],
        href: blogPostHasArticlePage(key) ? blogArticlePath(key) : "/journal",
      })),
    [t],
  );

  const starsLabel = (rating: number) => t("public.reviews.starsAria", { rating });

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ease = "power3.out";
    const ctx = gsap.context(() => {
      // —— All sections: smooth fade-up when entering viewport ——
      const sectionReveals = root.querySelectorAll(".section-reveal");
      sectionReveals.forEach((el) => {
        gsap.set(el, { opacity: 0, y: 40 });
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease,
          // Remove transform after reveal so nested position:sticky (feature cards) can work.
          clearProps: "transform",
          scrollTrigger: {
            trigger: el,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      });

      // —— Hero: infinite scroll gallery fade-up ——
      const heroGallery = root.querySelector(".hero-cards-reveal");
      if (heroGallery) {
        gsap.set(heroGallery, { opacity: 0, y: 40 });
        gsap.to(heroGallery, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease,
          scrollTrigger: {
            trigger: heroGallery,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Vision & Mission: image slides in from left ——
      const visionLeft = root.querySelector(".vision-reveal-left");
      if (visionLeft) {
        gsap.set(visionLeft, { opacity: 0, x: -80 });
        gsap.to(visionLeft, {
          opacity: 1,
          x: 0,
          duration: 1,
          ease,
          scrollTrigger: {
            trigger: visionLeft,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Vision & Mission: content (tabs + text) slides in from right ——
      const visionRight = root.querySelector(".vision-reveal-right");
      if (visionRight) {
        gsap.set(visionRight, { opacity: 0, x: 80 });
        gsap.to(visionRight, {
          opacity: 1,
          x: 0,
          duration: 1,
          ease,
          scrollTrigger: {
            trigger: visionRight,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Team cards: fade up with stagger ——
      const teamCards = root.querySelectorAll(".team-card-reveal");
      if (teamCards.length) {
        gsap.set(teamCards, { opacity: 0, y: 44 });
        const triggerEl = teamCards[0].parentElement ?? teamCards[0];
        gsap.to(teamCards, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.06,
          ease,
          scrollTrigger: {
            trigger: triggerEl,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Student reviews: fade up with stagger ——
      const reviewCards = root.querySelectorAll(".review-card-reveal");
      if (reviewCards.length) {
        gsap.set(reviewCards, { opacity: 0, y: 36 });
        const triggerEl = reviewCards[0].parentElement ?? reviewCards[0];
        gsap.to(reviewCards, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease,
          scrollTrigger: {
            trigger: triggerEl,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        });
      }

      // —— Stats bento grid: stagger cards ——
      const statsCards = root.querySelectorAll(".stats-card");
      if (statsCards.length) {
        gsap.set(statsCards, { opacity: 0, y: 36 });
        const statsGrid = root.querySelector(".stats-cards-grid");
        gsap.to(statsCards, {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.1,
          ease,
          scrollTrigger: {
            trigger: statsGrid ?? statsCards[0],
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      }

    }, root);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EduHubHeader />
      
      {/* Hero Section */}
      <section className="relative pt-0 pb-24 overflow-hidden bg-white">
        <div className="section-reveal container mx-auto px-6 pt-[200px] relative z-10">
          <div className="flex flex-col gap-16">
            {/* Content - Framer-style: badge, heading, text, CTA */}
            <div className="max-w-4xl relative w-full mx-auto text-center">
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5 mb-6" style={{ backgroundColor: 'rgb(240, 244, 243)' }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-90" style={{ backgroundColor: 'rgb(94, 107, 100)', transform: 'scale(1.9)' }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'rgb(19, 38, 27)' }} />
                </span>
                <span className="text-sm font-medium" style={{ color: 'rgb(19, 38, 27)' }}>{landingContent?.hero.badge ?? t("public.hero.badge")}</span>
              </div>
              {/* Heading */}
              <div className="mb-4">
                <h1 className="font-extrabold text-foreground tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '80px', lineHeight: '80%' }}>
                  {landingContent?.hero.titleLine1 ?? t("public.hero.titleLine1")}
                  <br />
                  <span className="block relative overflow-hidden" style={{ height: '1.2em', minWidth: '300px', display: 'inline-block' }}>
                    <span 
                      className="block bg-gradient-to-r from-[#3954d0] to-[#199eff] bg-clip-text text-transparent"
                      style={{ 
                        lineHeight: '1.2em',
                        animation: `slideUp ${words.length * 4}s linear infinite`,
                        willChange: 'transform',
                      }}
                    >
                      {[...words, ...words].map((word, index) => (
                        <span key={index} className="block" style={{ height: '1.2em' }}>
                          {word}
                        </span>
                      ))}
                    </span>
                  </span>
                </h1>
              </div>
              {/* Description */}
              <p className="max-w-4xl mx-auto mb-8 leading-relaxed" style={{ color: 'rgb(82, 94, 88)', fontSize: '16px' }}>
                {landingContent?.hero.descriptionLine1 ?? t("public.hero.descriptionLine1")}
                <br />
                {landingContent?.hero.descriptionLine2 ?? t("public.hero.descriptionLine2")}
              </p>
              {/* CTA - dark green, arrow */}
              <div className="flex flex-wrap justify-center">
                <button
                  className="inline-flex items-center gap-2 px-6 py-4 text-white rounded-[37px] font-semibold transition-all duration-300 hover:opacity-95 shadow-lg"
                  style={{ backgroundColor: '#3954d0' }}
                >
                  <span>{landingContent?.hero.learnMore ?? t("public.hero.learnMore")}</span>
                  <ArrowRight className="h-5 w-5 flex-shrink-0" />
                </button>
              </div>
            </div>

            <HeroInfiniteScrollGallery />
          </div>
        </div>
      </section>

      {/* Partnership Section - right below hero (Framer Logos style) */}
      <section className="py-24 bg-white relative">
        <div className="section-reveal container mx-auto px-6">
          {/* Tagline + heading */}
          <div className="text-center mb-12">
            <h2 className="text-lg lg:text-xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {t("public.partners.title")}
            </h2>
          </div>

          {/* Logo ticker - mask fade on edges, 64px gap */}
          <div
            className="flex w-full min-w-0 items-center overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)',
            }}
          >
            <ul className="flex items-center gap-4 list-none m-0 p-0 animate-scroll w-max">
              {[1, 2, 3].map((set) =>
                PARTNER_LOGOS.map((partner, index) => (
                  <li key={`set-${set}-${index}`} className="flex-shrink-0">
                    <div
                      className="flex h-20 min-w-[140px] items-center justify-center rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition-all duration-300 hover:border-slate-200 hover:bg-white"
                    >
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="h-12 max-w-[110px] object-contain mix-blend-multiply"
                        loading="lazy"
                      />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      <LandingAvailableClassesSection />

      {/* Stats Section - Framer Bento-style grid (wide + subgrid) */}
      <section className="pt-16 pb-[160px] px-6 lg:px-16 bg-white relative">
        <div className="section-reveal container mx-auto px-6">
          {/* Heading - Framer style: tagline pill + h2 */}
          <div className="mb-8 lg:mb-10 text-center">
            <div
              className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5 mb-4"
              style={{ backgroundColor: "rgb(240, 244, 243)" }}
            >
              <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                {t("public.stats.whyChooseUs")}
              </span>
            </div>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
              dangerouslySetInnerHTML={{ __html: t("public.stats.heading") }}
            />
          </div>
          <div
            className="stats-cards-grid grid gap-4 max-w-5xl mx-auto"
            style={{
              gridTemplateColumns: "1fr",
              gridTemplateRows: "auto",
            }}
          >
            {/* Row 1: wide card (2 cols) + one card — lg and up */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Wide card - 300+ Students (blue-500 like scroll-to-top button) */}
              <div
                className="stats-card rounded-[16px] min-h-[200px] lg:min-h-[260px] flex flex-col justify-center transition-all duration-300 lg:col-span-2 bg-blue-500"
              >
                <div className="p-6 lg:p-8 flex flex-col justify-center h-full">
                  <div className="text-4xl lg:text-5xl xl:text-[72px] font-bold leading-none mb-2 text-white">
                    {stats[0].value}
                  </div>
                  <h3 className="text-base font-semibold text-white/90" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {stats[0].label}
                  </h3>
                </div>
              </div>
              {/* Card 2 - 20+ courses & services (Framer-style: title + pills for movement animation) */}
              <div
                className="stats-card rounded-[16px] min-h-[200px] lg:min-h-[260px] flex flex-col transition-all duration-300 overflow-visible"
                style={{ backgroundColor: "rgb(242, 241, 241)" }}
              >
                <div className="flex flex-col flex-1">
                  <h4
                    className="text-center text-[32px] font-bold mb-3 flex-shrink-0 px-5 lg:px-6 pt-5 lg:pt-6"
                    style={{ color: "rgb(38, 41, 46)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {t("public.stats.classesHeading")}
                  </h4>
                  <div className="flex flex-col gap-2 flex-1 justify-center min-h-0 overflow-hidden">
                    {/* Row 1 - marquee right-to-left, looped */}
                    <div className="overflow-hidden">
                      <div
                        className="flex items-center gap-2 flex-nowrap w-max"
                        style={{
                          animation: "marquee-r2l 25s linear infinite",
                        }}
                      >
                        {[...Array(8)].map((_, copy) =>
                          statTags.row1.map((tag) => (
                            <span
                              key={`r1-${copy}-${tag}`}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
                              style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(38, 41, 46)" }}
                            >
                              {t(`public.stats.tags.${tag}`)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Row 2 - marquee left-to-right, looped */}
                    <div className="overflow-hidden">
                      <div
                        className="flex items-center gap-2 flex-nowrap w-max"
                        style={{
                          animation: "marquee-l2r 25s linear infinite",
                        }}
                      >
                        {[...Array(8)].map((_, copy) =>
                          statTags.row2.map((tag, i) => (
                            <span
                              key={`r2-${copy}-${i}-${tag}`}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
                              style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(38, 41, 46)" }}
                            >
                              {t(`public.stats.tags.${tag}`)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    {/* Row 3 - copy of Row 1 (right-to-left), placed below Row 2 */}
                    <div className="overflow-hidden">
                      <div
                        className="flex items-center gap-2 flex-nowrap w-max"
                        style={{
                          animation: "marquee-r2l 25s linear infinite",
                        }}
                      >
                        {[...Array(8)].map((_, copy) =>
                          statTags.row1.map((tag) => (
                            <span
                              key={`r3a-${copy}-${tag}`}
                              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
                              style={{ backgroundColor: "rgb(255, 255, 255)", color: "rgb(38, 41, 46)" }}
                            >
                              {t(`public.stats.tags.${tag}`)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-center text-sm font-medium mt-2 flex-shrink-0 px-5 lg:px-6 pb-5 lg:pb-6"
                    style={{ color: "rgb(102, 112, 122)", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {t("public.stats.wideVariety")}
                  </p>
                </div>
              </div>
            </div>
            {/* Row 2: subgrid — 3 equal cards (100+ Graduates, 15+ Teachers, 3 International teachers) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.slice(2, 5).map((stat) => {
                const isAccent = stat.bento === "accent";
                return (
                  <div
                    key={stat.label}
                    className="stats-card rounded-[16px] min-h-[200px] lg:min-h-[240px] flex flex-col justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isAccent ? "rgb(255, 190, 60)" : "rgb(242, 241, 241)",
                    }}
                  >
                    <div className="p-6 lg:p-8 flex flex-col justify-center h-full text-center">
                      <div
                        className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-none mb-2"
                        style={{ color: "rgb(38, 41, 46)" }}
                      >
                        {stat.value}
                      </div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: isAccent ? "rgb(38, 41, 46)" : "rgb(102, 112, 122)", fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {stat.label}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Meet Our Team Section - Framer layout: badge, title, white cards with image + info + LinkedIn */}
      <section className="py-20 bg-gray-50 relative">
        <div className="section-reveal container mx-auto px-6">
          {/* Heading Block - Framer style: Badge and Title side by side */}
          <div className="mb-12">
            <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
              <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-16 text-left w-full max-w-7xl mx-auto">
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight flex-shrink-0"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
                >
                  {t("public.team.titleLine1")}
                <br />
                {t("public.team.titleLine2")}
                </h2>
                <p className="text-base leading-relaxed max-w-2xl lg:ml-auto lg:text-right" style={{ color: "rgb(88, 88, 102)" }}>
                  {t("public.team.subtitleLine1")}
                  <br />
                  {t("public.team.subtitleLine2")}
                </p>
              </div>
            </div>
          </div>

          {/* Team grid - Framer card: white, rounded-16, image 16px radius, info + LinkedIn */}
          <div className="grid grid-cols-2 gap-4 max-w-7xl mx-auto lg:grid-cols-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="team-card-reveal group rounded-[16px] overflow-hidden bg-white flex flex-col h-full w-full"
                style={{ backgroundColor: "rgb(255, 255, 255)" }}
              >
                <div
                  className="aspect-square w-full overflow-hidden p-2"
                  style={{ borderRadius: "14px 14px 8px 8px" }}
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover block transition-transform duration-300 ease-out group-hover:scale-105"
                    style={{ borderRadius: "inherit", objectPosition: "center", objectFit: "cover" }}
                  />
                </div>
                <div className="p-5 flex flex-col flex-1 items-center text-center" data-framer-name="Info Block">
                  <div className="flex flex-col flex-1 text-center w-full">
                    <p className="text-lg font-semibold mb-1" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif", lineHeight: "120%" }}>
                      {member.nameLine1}
                      <br />
                      {member.nameLine2}
                    </p>
                    <p className="text-sm mb-4" style={{ color: "rgb(88, 88, 102)" }}>
                      {member.roleLine1}
                      <br />
                      {member.roleLine2}
                    </p>
                  </div>
                  <a
                    href="https://www.linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white hover:opacity-90 transition-opacity flex-shrink-0"
                    style={{ backgroundColor: "rgb(3, 2, 11)", borderRadius: "100px" }}
                    aria-label={t("public.team.linkedin")}
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features Section — sticky card stack; avoid section-reveal transform on this wrapper */}
      <section className="py-24 relative bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-8 items-start lg:grid-cols-2 lg:gap-12">
            <div className="section-reveal text-center lg:text-left lg:sticky lg:top-24 pt-4 flex flex-col lg:h-[600px]">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {t("public.features.title")}
              </h2>
              <p className="text-foreground/70 max-w-2xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed mb-4 lg:mb-4" style={{ fontSize: '16px' }}>
                {t("public.features.descriptionLine1")}
                <span className="hidden lg:inline">
                  {" "}{t("public.features.descriptionLine2")}
                </span>
              </p>
              <p className="hidden lg:block text-foreground/70 max-w-2xl lg:max-w-none mx-auto lg:mx-0 leading-relaxed mb-6 flex-1 min-h-0" style={{ fontSize: '16px' }}>
                {t("public.features.descriptionLine3")}
              </p>
              <div className="hidden lg:block">
              <Link
                to={appRoutes.about}
                className="mt-auto self-start inline-flex items-center gap-2 px-6 py-3 rounded-[37px] font-semibold text-white transition-opacity hover:opacity-90 w-fit mx-auto lg:mx-0 shrink-0"
                style={{ backgroundColor: "#3954d0" }}
              >
                {t("public.features.learnMore")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-2 lg:pt-4 pb-8 lg:pb-0">
            {features.map((feature, index) => (
                <div
                  key={feature.key}
                  className="sticky top-[5.5rem] lg:top-24 rounded-[24px] overflow-hidden p-4 shadow-sm"
                  style={{
                    background: "rgb(249, 250, 251)",
                    zIndex: index + 1,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[rgb(238,238,238)] flex items-center justify-center flex-shrink-0 text-sm font-medium" style={{ color: "rgb(109, 109, 109)" }}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-lg font-semibold" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>{feature.title}</h3>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm leading-relaxed" style={{ color: "rgb(109, 109, 109)" }}>{feature.description}</p>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-[20px]">
                    <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-gray-200">
                      <img
                        src={feature.image}
                        alt={feature.imageAlt}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/600x450/e5e7eb/9ca3af?text=Image";
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center lg:hidden">
            <Link
              to={appRoutes.about}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[37px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#3954d0" }}
            >
              {t("public.features.learnMore")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section - Framer layout: image left, content right with tabs */}

      <section className="py-20 bg-white relative">
        <div className="section-reveal container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="vision-reveal-left rounded-[24px] overflow-hidden w-full h-[320px] sm:h-[400px] lg:h-[600px] relative flex-shrink-0">
              <img
                src="/eduhub/vision-community.png"
                alt={t("public.vision.imageAlt")}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            </div>

            <div className="vision-reveal-right flex flex-col min-h-[320px]">
              <div className="flex flex-col gap-4 mb-6">
                <div
                  className="inline-flex items-center gap-2 rounded-[32px] px-4 py-1.5 w-fit"
                  style={{ backgroundColor: "rgb(240, 244, 243)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "rgb(19, 38, 27)" }}>
                    {t("public.vision.badge")}
                  </span>
                </div>
                <h2
                  className="text-3xl md:text-4xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: t("public.vision.title") }}
                />
              </div>

              <div className="tabs mb-6">
                <div className="relative w-full">
                  <span
                    className="absolute top-0 left-0 z-0 h-10 w-1/3 rounded-full transition-transform duration-[400ms] ease-[cubic-bezier(0.33,1,0.68,1)] sm:h-11 lg:h-12"
                    style={{
                      backgroundColor: "#199eff",
                      transform: `translateX(${visionTab === "mission" ? 0 : visionTab === "vision" ? 100 : 200}%)`,
                    }}
                    aria-hidden
                  />
                  <ul className="grid grid-cols-3 list-none p-0 m-0 w-full">
                    <li>
                      <button
                        type="button"
                        role="tab"
                        onClick={() => setVisionTab("mission")}
                        className={`relative z-10 inline-flex h-10 w-full items-center justify-center rounded-full px-1 text-[11px] font-medium leading-tight transition-colors duration-200 sm:h-11 sm:px-2 sm:text-xs lg:h-12 lg:px-4 lg:text-sm ${visionTab !== "mission" ? "text-gray-500 hover:text-gray-800" : ""}`}
                        style={visionTab === "mission" ? { color: "#fff" } : undefined}
                      >
                        {t("public.vision.tabs.mission")}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="tab"
                        onClick={() => setVisionTab("vision")}
                        className={`relative z-10 inline-flex h-10 w-full items-center justify-center rounded-full px-1 text-[11px] font-medium leading-tight transition-colors duration-200 sm:h-11 sm:px-2 sm:text-xs lg:h-12 lg:px-4 lg:text-sm ${visionTab !== "vision" ? "text-gray-500 hover:text-gray-800" : ""}`}
                        style={visionTab === "vision" ? { color: "#fff" } : undefined}
                      >
                        {t("public.vision.tabs.vision")}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="tab"
                        onClick={() => setVisionTab("values")}
                        className={`relative z-10 inline-flex h-10 w-full items-center justify-center rounded-full px-1 text-[11px] font-medium leading-tight transition-colors duration-200 sm:h-11 sm:px-2 sm:text-xs lg:h-12 lg:px-4 lg:text-sm ${visionTab !== "values" ? "text-gray-500 hover:text-gray-800" : ""}`}
                        style={visionTab === "values" ? { color: "#fff" } : undefined}
                      >
                        {t("public.vision.tabs.values")}
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                {visionTab === "mission" && (
                  <>
                    <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                      {t("public.vision.mission.intro")}
                    </p>
                    <ul className="space-y-3">
                      {missionItems.map((text, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        </div>
                          <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {visionTab === "vision" && (
                  <>
                    <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                      {t("public.vision.visionContent.intro")}
                    </p>
                    <ul className="space-y-3">
                      {visionPoints.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        </div>
                          <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}><strong>{item.title}:</strong> {item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {visionTab === "values" && (
                  <>
                    <p className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>
                      {t("public.vision.values.intro")}
                    </p>
                    <ul className="space-y-3">
                      {valuesItems.map((text, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                        </div>
                          <span className="text-base leading-relaxed" style={{ color: "rgb(75, 85, 84)" }}>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student voices — bento layout (matches stats / features Framer panels) */}
      <section className="relative bg-gray-50 py-20">
        <div className="section-reveal container mx-auto max-w-7xl px-6">
          <div className="mb-12">
            <div className="flex w-full flex-col gap-6 text-left lg:flex-row lg:items-end lg:gap-16">
              <h2
                className="flex-shrink-0 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
              >
                {t("public.reviews.titleLine1")}
                <br />
                {t("public.reviews.titleLine2")}
              </h2>
              <p
                className="max-w-2xl text-base leading-relaxed lg:ml-auto lg:text-right"
                style={{ color: "rgb(88, 88, 102)" }}
              >
                {t("public.reviews.subtitle")}
              </p>
            </div>
          </div>

          <div className="rounded-[16px] p-2" style={{ backgroundColor: "rgb(249, 250, 251)" }}>
            <div className="grid gap-2 lg:grid-cols-12">
              <article
                className="review-card-reveal flex min-h-[320px] flex-col justify-between rounded-[20px] bg-white p-6 sm:p-8 lg:col-span-7 lg:row-span-2 lg:min-h-[420px] lg:p-10"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-[32px] px-3 py-1 text-xs font-medium"
                      style={{ backgroundColor: "rgb(240, 244, 243)", color: "rgb(19, 38, 27)" }}
                    >
                      {featuredReview.course}
                    </span>
                    <ReviewStars rating={featuredReview.rating} size="md" starsLabel={starsLabel(featuredReview.rating)} />
                  </div>
                  <p
                    className="mt-6 text-xl font-medium leading-snug sm:text-2xl lg:text-[1.65rem] lg:leading-[1.35]"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(3, 2, 11)" }}
                  >
                    {featuredReview.quote}
                  </p>
                </div>
                <div className="mt-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif" }}>
                      {featuredReview.name}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "rgb(88, 88, 102)" }}>
                      {t("public.reviews.studentLabel")}
                    </p>
                  </div>
                  <span
                    className="select-none text-5xl font-bold leading-none sm:text-6xl"
                    style={{ color: "rgb(238, 238, 238)", fontFamily: "'DM Sans', sans-serif" }}
                    aria-hidden
                  >
                    {reviewIndexLabel(studentReviews.indexOf(featuredReview))}
                  </span>
                </div>
              </article>

              {supportingReviews.slice(0, 2).map((review) => {
                const reviewIndex = studentReviews.indexOf(review);
                return (
                  <article
                    key={review.name}
                    className="review-card-reveal flex min-h-[200px] flex-col rounded-[20px] bg-white p-5 sm:p-6 lg:col-span-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                        style={{ backgroundColor: "rgb(238, 238, 238)", color: "rgb(109, 109, 109)" }}
                      >
                        {reviewIndexLabel(reviewIndex)}
                      </div>
                      <p className="pt-1 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(109, 109, 109)" }}>
                        {review.course}
                      </p>
                    </div>
                    <ReviewStars rating={review.rating} className="mt-3" starsLabel={starsLabel(review.rating)} />
                    <p className="mt-3 flex-1 text-sm leading-relaxed sm:text-[15px]" style={{ color: "rgb(75, 85, 84)" }}>
                      {review.quote}
                    </p>
                    <p className="mt-5 text-sm font-semibold" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif" }}>
                      {review.name}
                    </p>
                  </article>
                );
              })}

              {supportingReviews.slice(2).map((review) => {
                const reviewIndex = studentReviews.indexOf(review);
                return (
                  <article
                    key={review.name}
                    className="review-card-reveal flex min-h-[200px] flex-col rounded-[20px] bg-white p-5 sm:p-6 lg:col-span-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium"
                        style={{ backgroundColor: "rgb(238, 238, 238)", color: "rgb(109, 109, 109)" }}
                      >
                        {reviewIndexLabel(reviewIndex)}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "rgb(61, 61, 61)", fontFamily: "'DM Sans', sans-serif" }}>
                        {review.course}
                      </p>
                    </div>
                    <ReviewStars rating={review.rating} className="mt-3" starsLabel={starsLabel(review.rating)} />
                    <p className="mt-3 flex-1 text-sm leading-relaxed line-clamp-4" style={{ color: "rgb(75, 85, 84)" }}>
                      {review.quote}
                    </p>
                    <p className="mt-4 text-sm font-semibold" style={{ color: "rgb(3, 2, 11)", fontFamily: "'DM Sans', sans-serif" }}>
                      {review.name}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Video Content Section - Framer layout: content left, video right */}
      <section className="py-24 bg-background">
        <div className="section-reveal container mx-auto px-6">
          <div className="grid lg:grid-cols-[2fr_3fr] gap-12 items-stretch p-8 bg-gray-100 rounded-[16px]">
            {/* Left - Content (Framer style: pill badge, heading, text, button, stars) */}
            <div className="flex flex-col">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(17, 17, 17)" }}>
                {t("public.video.titleLine1")}
                <br />
                {t("public.video.titleLine2")}
              </h2>
              <p className="mb-6 leading-relaxed max-w-md" style={{ color: "rgb(61, 61, 61)", fontSize: "16px" }}>
                {t("public.video.description")}
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.125rem", color: "rgb(17, 17, 17)" }}>{t("public.video.interactiveTitle")}</h3>
                    <p className="text-sm" style={{ color: "rgb(61, 61, 61)" }}>{t("public.video.interactiveDesc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.125rem", color: "rgb(17, 17, 17)" }}>{t("public.video.expertTitle")}</h3>
                    <p className="text-sm" style={{ color: "rgb(61, 61, 61)" }}>{t("public.video.expertDesc")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden h-full">
              <video className="w-full h-full object-cover rounded-[16px]" controls>
                <source src="/tisu2.mp4" type="video/mp4" />
                {t("public.video.unsupported")}
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Insights & Updates / Blog Section */}
      <section className="py-24 bg-background">
        <div className="section-reveal container mx-auto px-6 max-w-6xl">
          <header className="text-center mb-12">
            <div
              className="inline-flex items-center justify-center rounded-[40px] px-5 py-2.5 mb-6 border border-[rgb(230,230,230)] bg-white text-base font-medium"
              style={{ boxShadow: "rgba(0,0,0,0.1) 0px 4px 12px 0px", color: "rgb(61, 61, 61)" }}
            >
              {t("public.blog.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>
              {t("public.blog.title")}
            </h2>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 items-stretch">
            {blogPosts.map((post) => (
            <div key={post.key} className="h-full">
            <Link
              to={post.href}
              className="group flex h-full flex-col rounded-[24px] overflow-hidden transition-shadow duration-300 hover:shadow-[0_10px_15px_rgba(0,0,0,0.15)]"
              style={{ background: "linear-gradient(336deg, rgb(250,250,250) 0%, rgb(255,255,255) 54%, rgb(238,238,238) 100%)" }}
            >
              <div className="rounded-[20px] overflow-hidden p-2">
                <div className="rounded-[20px] overflow-hidden aspect-[4/3] bg-gray-200">
                  <img
                    src={post.image}
                    alt={post.imageAlt}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5 pt-0">
                <h5 className="mb-2 min-h-[5.0625rem] text-lg font-semibold leading-normal group-hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(61, 61, 61)" }}>
                  {post.title}
                </h5>
                <p className="text-sm leading-relaxed" style={{ color: "rgb(153, 153, 153)" }}>
                  {post.description}
                </p>
              </div>
            </Link>
            </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-24 bg-white">
        <div className="section-reveal container mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {t("public.highlights.title")}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto leading-relaxed" style={{ fontSize: '16px' }}>
              {t("public.highlights.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <div
                  key={highlight.key}
                  className="flex flex-col rounded-2xl p-6 bg-white"
                >
                  <div className="flex flex-col gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgb(245, 248, 255)" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: "rgb(18, 18, 18)" }} />
                    </div>
                    <h3 className="text-xl font-semibold" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgb(18, 18, 18)", fontSize: "20px" }}>
                      {highlight.title}
                    </h3>
                  </div>
                  <p className="text-base leading-relaxed flex-1" style={{ color: "rgb(109, 109, 109)", fontSize: "16px" }}>
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section - Framer banner style (dark bg, badge, heading, mint CTA) - hidden per request */}
      <section className="py-24 bg-white hidden" aria-hidden="true">
        <div className="container mx-auto px-6">
          <div
            className="relative overflow-hidden rounded-2xl p-12 lg:p-16 text-center"
            style={{ backgroundColor: "rgb(3, 31, 42)" }}
          >
            <div className="relative z-10 flex flex-col items-center">
              {/* Top row: badge pill + text pill (Framer With Logo - Dark) */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <div
                  className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5"
                  style={{ backgroundColor: "rgb(216, 242, 194)" }}
                >
                  <img src="/logo-eduhub.png" alt="" className="h-6 w-auto object-contain" />
                </div>
                <div
                  className="inline-flex items-center rounded-[10px] px-3 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                >
                  {landingContent?.cta.qualityEducation ?? t("public.cta.qualityEducation")}
                </div>
              </div>
              <h3
                className="text-2xl lg:text-4xl font-bold mb-8 text-white max-w-2xl"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {landingContent?.cta.title ?? t("public.cta.title")}
              </h3>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-base font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "rgb(215, 245, 188)", color: "rgb(3, 31, 42)" }}
              >
                {landingContent?.cta.button ?? t("public.cta.button")}
                <span className="ml-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating support + scroll actions */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-center gap-3">
        <a
          href={EDUHUB_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:opacity-90 hover:shadow-2xl"
          style={{ backgroundColor: "#0088cc" }}
          aria-label={t("public.telegramSupport")}
        >
          <Telegram className="h-7 w-7" />
        </a>
        <button
          type="button"
          onClick={scrollToTop}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:opacity-90 hover:shadow-2xl ${
            showScrollTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
          }`}
          style={{ backgroundColor: "#199eff" }}
          aria-label={t("public.scrollToTop")}
        >
          <ChevronUp className="h-7 w-7" />
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default EduHub;

