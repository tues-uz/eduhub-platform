import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Globe,
  Link2,
  Megaphone,
} from "@/lib/icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import type { LucideIcon } from "@/lib/icons";

type ContentTool = {
  slug: string;
  path: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  demo?: boolean;
};

const QUICK_ACTIONS = [
  {
    labelKey: "admin.contentHub.tools.landingPage.title",
    path: "/dashboard/admin/landing-page",
    icon: Globe,
  },
  {
    labelKey: "adminNav.allClassesSchedules",
    path: "/dashboard/admin/courses",
    icon: BookOpen,
  },
  {
    labelKey: "adminNav.studentPromos",
    path: "/dashboard/admin/promos",
    icon: Megaphone,
  },
  {
    labelKey: "adminNav.referralCodes",
    path: "/dashboard/admin/referral-codes",
    icon: Link2,
  },
  {
    labelKey: "adminNav.specialTuition",
    path: "/dashboard/admin/special-tuition",
    icon: BookOpen,
  },
] as const;

const CONTENT_TOOLS: ContentTool[] = [
  {
    slug: "landing-page",
    path: "/dashboard/admin/landing-page",
    icon: Globe,
    titleKey: "admin.contentHub.tools.landingPage.title",
    descriptionKey: "admin.contentHub.tools.landingPage.description",
    demo: true,
  },
  {
    slug: "courses",
    path: "/dashboard/admin/courses",
    icon: BookOpen,
    titleKey: "adminNav.allClassesSchedules",
    descriptionKey: "admin.contentHub.tools.courses.description",
  },
  {
    slug: "promos",
    path: "/dashboard/admin/promos",
    icon: Megaphone,
    titleKey: "adminNav.studentPromos",
    descriptionKey: "admin.promos.description",
  },
  {
    slug: "referral-codes",
    path: "/dashboard/admin/referral-codes",
    icon: Link2,
    titleKey: "adminNav.referralCodes",
    descriptionKey: "admin.contentHub.tools.referralCodes.description",
  },
];

export default function AdminContentHubPage() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const isContentAdmin = user.staffRole === "ADMIN_CONTENT";

  return (
      <div className="container mx-auto max-w-5xl px-6">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="mb-1.5 text-3xl font-semibold tracking-tight text-slate-900">
                {isContentAdmin ? formatDisplayPersonName(user.name) : t("adminNav.websiteContent")}
              </h1>
              <p className="text-sm font-medium text-slate-600">
                {isContentAdmin ? t("admin.contentHub.subtitle") : t("admin.contentHub.description")}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-800">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              {t("admin.addUserRole.roles.adminContent")}
            </span>
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Globe className="h-6 w-6 text-violet-700" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {t("admin.contentHub.featured.landingPage.title")}
                  </h2>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                    {t("admin.addUserRole.hub.demoBadge")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {t("admin.contentHub.featured.landingPage.description")}
                </p>
              </div>
            </div>
            <Button className="shrink-0 bg-violet-700 hover:bg-violet-800" asChild>
              <Link to="/dashboard/admin/landing-page">
                {t("admin.contentHub.featured.landingPage.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("admin.contentHub.quickActions")}</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.path} variant="outline" className="rounded-lg bg-white" asChild>
                  <Link to={action.path}>
                    <Icon className="mr-2 h-4 w-4" aria-hidden />
                    {t(action.labelKey)}
                  </Link>
                </Button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("admin.contentHub.allTools")}</h2>
          <div className="grid gap-3">
            {CONTENT_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.slug}
                  to={tool.path}
                  className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-700" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{t(tool.titleKey)}</p>
                      {tool.demo ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                          {t("admin.addUserRole.hub.demoBadge")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{t(tool.descriptionKey)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
  );
}
