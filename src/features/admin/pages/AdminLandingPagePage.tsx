import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "@/lib/icons";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatHeroWordsInput,
  parseHeroWordsInput,
  readLandingPageContent,
  resetLandingPageContent,
  writeLandingPageContent,
  type LandingPageContent,
} from "@/features/landing/landingPageContent";
import { appRoutes } from "@/app/routes";

function buildDefaultsFromI18n(t: (key: string, options?: { returnObjects?: boolean }) => string): LandingPageContent {
  const words = t("public.hero.words", { returnObjects: true }) as unknown;
  return {
    hero: {
      badge: t("public.hero.badge"),
      titleLine1: t("public.hero.titleLine1"),
      words: Array.isArray(words) ? words.map(String) : ["Excellence"],
      descriptionLine1: t("public.hero.descriptionLine1"),
      descriptionLine2: t("public.hero.descriptionLine2"),
      learnMore: t("public.hero.learnMore"),
    },
    cta: {
      qualityEducation: t("public.cta.qualityEducation"),
      title: t("public.cta.title"),
      button: t("public.cta.button"),
    },
    stats: {
      students: "300+",
      classes: "20+",
      teachers: "100+",
      completionRate: "15+",
      yearsExcellence: "3",
    },
    updatedAt: new Date().toISOString(),
  };
}

export default function AdminLandingPagePage() {
  const { t } = useTranslation();
  const defaults = useMemo(() => buildDefaultsFromI18n(t), [t]);
  const [form, setForm] = useState<LandingPageContent>(() => readLandingPageContent() ?? defaults);
  const [wordsInput, setWordsInput] = useState(() =>
    formatHeroWordsInput((readLandingPageContent() ?? defaults).hero.words),
  );

  const save = () => {
    const words = parseHeroWordsInput(wordsInput);
    if (!form.hero.badge.trim() || !form.hero.titleLine1.trim() || words.length === 0) {
      toast.error(t("admin.landingPage.toast.requiredFields"));
      return;
    }

    writeLandingPageContent({
      ...form,
      hero: { ...form.hero, words },
    });
    setForm((prev) => ({ ...prev, hero: { ...prev.hero, words } }));
    toast.success(t("admin.landingPage.toast.saved"));
  };

  const reset = () => {
    resetLandingPageContent();
    setForm(defaults);
    setWordsInput(formatHeroWordsInput(defaults.hero.words));
    toast.success(t("admin.landingPage.toast.reset"));
  };

  return (
      <div className="container mx-auto max-w-2xl px-6">
        <Link
          to="/dashboard/admin/content"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.landingPage.backToContentHub")}
        </Link>

        <AdminPageHeader
          title={t("admin.landingPage.title")}
          description={t("admin.landingPage.description")}
          actions={
            <>
              <Button type="button" variant="outline" asChild>
                <a href={appRoutes.home} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("admin.landingPage.preview")}
                </a>
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                {t("admin.landingPage.resetDefaults")}
              </Button>
              <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={save}>
                {t("admin.landingPage.save")}
              </Button>
            </>
          }
        />

        <div className="space-y-8">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("admin.landingPage.sections.hero")}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero-badge">{t("admin.landingPage.fields.badge")}</Label>
                <Input
                  id="hero-badge"
                  value={form.hero.badge}
                  onChange={(e) => setForm((prev) => ({ ...prev, hero: { ...prev.hero, badge: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-title">{t("admin.landingPage.fields.titleLine1")}</Label>
                <Input
                  id="hero-title"
                  value={form.hero.titleLine1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, hero: { ...prev.hero, titleLine1: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-words">{t("admin.landingPage.fields.rotatingWords")}</Label>
                <Input
                  id="hero-words"
                  value={wordsInput}
                  onChange={(e) => setWordsInput(e.target.value)}
                  placeholder={t("admin.landingPage.fields.rotatingWordsPlaceholder")}
                />
                <p className="text-xs text-slate-500">{t("admin.landingPage.fields.rotatingWordsHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-desc1">{t("admin.landingPage.fields.descriptionLine1")}</Label>
                <Textarea
                  id="hero-desc1"
                  rows={3}
                  value={form.hero.descriptionLine1}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, hero: { ...prev.hero, descriptionLine1: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-desc2">{t("admin.landingPage.fields.descriptionLine2")}</Label>
                <Textarea
                  id="hero-desc2"
                  rows={3}
                  value={form.hero.descriptionLine2}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, hero: { ...prev.hero, descriptionLine2: e.target.value } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-cta">{t("admin.landingPage.fields.heroButton")}</Label>
                <Input
                  id="hero-cta"
                  value={form.hero.learnMore}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, hero: { ...prev.hero, learnMore: e.target.value } }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("admin.landingPage.sections.stats")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["students", t("public.stats.students")],
                  ["classes", t("public.stats.classes")],
                  ["teachers", t("public.stats.teachers")],
                  ["completionRate", t("public.stats.completionRate")],
                  ["yearsExcellence", t("public.stats.yearsExcellence")],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`stat-${key}`}>{label}</Label>
                  <Input
                    id={`stat-${key}`}
                    value={form.stats[key]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        stats: { ...prev.stats, [key]: e.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("admin.landingPage.sections.cta")}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cta-badge">{t("admin.landingPage.fields.ctaBadge")}</Label>
                <Input
                  id="cta-badge"
                  value={form.cta.qualityEducation}
                  onChange={(e) => setForm((prev) => ({ ...prev, cta: { ...prev.cta, qualityEducation: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-title">{t("admin.landingPage.fields.ctaTitle")}</Label>
                <Input
                  id="cta-title"
                  value={form.cta.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, cta: { ...prev.cta, title: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-button">{t("admin.landingPage.fields.ctaButton")}</Label>
                <Input
                  id="cta-button"
                  value={form.cta.button}
                  onChange={(e) => setForm((prev) => ({ ...prev, cta: { ...prev.cta, button: e.target.value } }))}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
  );
}
