const STORAGE_KEY = "eduhub_landing_page_content";
export const LANDING_PAGE_CONTENT_CHANGED_EVENT = "eduhub-landing-page-changed";

export type LandingPageHero = {
  badge: string;
  titleLine1: string;
  words: string[];
  descriptionLine1: string;
  descriptionLine2: string;
  learnMore: string;
};

export type LandingPageCta = {
  qualityEducation: string;
  title: string;
  button: string;
};

export type LandingPageStats = {
  students: string;
  classes: string;
  teachers: string;
  completionRate: string;
  yearsExcellence: string;
};

export type LandingPageContent = {
  hero: LandingPageHero;
  cta: LandingPageCta;
  stats: LandingPageStats;
  updatedAt: string;
};

function trimText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((w) => (typeof w === "string" ? w.trim().slice(0, 40) : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeContent(raw: unknown): LandingPageContent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const heroRaw = o.hero;
  const ctaRaw = o.cta;
  const statsRaw = o.stats;
  if (!heroRaw || typeof heroRaw !== "object" || !ctaRaw || typeof ctaRaw !== "object") return null;

  const hero = heroRaw as Record<string, unknown>;
  const cta = ctaRaw as Record<string, unknown>;
  const stats = statsRaw && typeof statsRaw === "object" ? (statsRaw as Record<string, unknown>) : {};

  const words = normalizeWords(hero.words);
  if (!trimText(hero.badge, 120) || !trimText(hero.titleLine1, 120) || words.length === 0) return null;

  return {
    hero: {
      badge: trimText(hero.badge, 120),
      titleLine1: trimText(hero.titleLine1, 120),
      words,
      descriptionLine1: trimText(hero.descriptionLine1, 500),
      descriptionLine2: trimText(hero.descriptionLine2, 500),
      learnMore: trimText(hero.learnMore, 60) || "Learn More",
    },
    cta: {
      qualityEducation: trimText(cta.qualityEducation, 120),
      title: trimText(cta.title, 200),
      button: trimText(cta.button, 80) || "Get started",
    },
    stats: {
      students: trimText(stats.students, 40) || "50,000+",
      classes: trimText(stats.classes, 40) || "500+",
      teachers: trimText(stats.teachers, 40) || "200+",
      completionRate: trimText(stats.completionRate, 40) || "95%",
      yearsExcellence: trimText(stats.yearsExcellence, 40) || "10+",
    },
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

function notifyChanged() {
  window.dispatchEvent(new Event(LANDING_PAGE_CONTENT_CHANGED_EVENT));
}

export function readLandingPageContent(): LandingPageContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeContent(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

import { eduhubLandingPage } from "@/api/eduhubClient";

export function writeLandingPageContent(content: LandingPageContent) {
  const next = normalizeContent({ ...content, updatedAt: new Date().toISOString() });
  if (!next) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyChanged();

  // Async sync to backend REST API
  void eduhubLandingPage.updateSection("landing_main", JSON.stringify(next)).catch((e) => {
    console.warn("[LandingPageCMS] API sync failed, relying on local storage", e);
  });
}

export function resetLandingPageContent() {
  localStorage.removeItem(STORAGE_KEY);
  notifyChanged();
}


export function parseHeroWordsInput(input: string): string[] {
  return input
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function formatHeroWordsInput(words: string[]): string {
  return words.join(", ");
}
