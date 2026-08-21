import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Loader2 } from "@/lib/icons";
import { InstructorAvatar } from "@/components/InstructorAvatar";
import { getAccessToken } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { appRoutes } from "@/app/routes";
import { useAuthSession } from "@/features/auth/context";
import {
  fetchPublishedAvailableCourses,
  PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED,
  readPublishedAvailableCoursesCache,
} from "@/features/courses/publishedAvailableCourses";
import { formatDisplayPersonName } from "@/lib/formatPersonName";

const LANDING_CLASS_LIMIT = 8;

function formatTuition(amount: number | undefined, currency: string | undefined, freeLabel: string): string {
  if (amount == null || amount <= 0) return freeLabel;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "UZS",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency || ""}`.trim();
  }
}

function initialClasses(): CourseSummaryResponse[] {
  return readPublishedAvailableCoursesCache().slice(0, LANDING_CLASS_LIMIT);
}

export function LandingAvailableClassesSection() {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [classes, setClasses] = useState<CourseSummaryResponse[]>(initialClasses);
  const [loading, setLoading] = useState(true);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPublishedAvailableCourses(100);
      setClasses(rows.slice(0, LANDING_CLASS_LIMIT));
    } catch {
      setClasses(initialClasses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses, user.id, user.role]);

  useEffect(() => {
    const refreshFromCache = () => {
      const cached = readPublishedAvailableCoursesCache();
      if (cached.length > 0) setClasses(cached.slice(0, LANDING_CLASS_LIMIT));
    };
    window.addEventListener(PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED, refreshFromCache);
    window.addEventListener("storage", refreshFromCache);
    return () => {
      window.removeEventListener(PUBLISHED_AVAILABLE_COURSES_CACHE_CHANGED, refreshFromCache);
      window.removeEventListener("storage", refreshFromCache);
    };
  }, []);

  const signedIn = Boolean(getAccessToken());
  const browseHref = signedIn ? `${appRoutes.dashboard}/available-courses` : appRoutes.register;

  return (
    <section className="bg-slate-50 py-24 relative">
      <div className="section-reveal container mx-auto px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("public.availableClasses.eyebrow")}
            </p>
            <h2
              className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {t("public.availableClasses.title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              {t("public.availableClasses.subtitle")}
            </p>
          </div>
          <Link
            to={browseHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#3954d0] transition-colors hover:text-[#2f45b0]"
          >
            {t("public.availableClasses.viewAll")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {loading && classes.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
            <span className="sr-only">{t("common.loading")}</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 py-16 text-center">
            <BookOpen className="h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-700">
              {t("public.availableClasses.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-500">{t("public.availableClasses.emptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {classes.map((course) => {
              const price = course.pricing?.discountedAmount ?? course.pricing?.amount;
              const href = appRoutes.publicClassDetail(course.id);
              return (
                <Link
                  key={course.id}
                  to={href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative mx-3 mt-3 aspect-square overflow-hidden rounded-xl bg-slate-100">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" aria-hidden>
                        <BookOpen className="h-10 w-10 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                    {course.category?.trim() ? (
                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {course.category.trim()}
                      </span>
                    ) : null}
                    <h3
                      className="mt-2 line-clamp-2 text-base font-bold leading-snug tracking-tight text-slate-900"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {course.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <InstructorAvatar
                        name={course.lecturerName}
                        avatarUrl={course.lecturerAvatarUrl}
                        className="h-8 w-8"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {formatDisplayPersonName(course.lecturerName)}
                        </p>
                        <p className="text-xs text-slate-500">{t("public.availableClasses.instructor")}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {t("public.availableClasses.tuition")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#3954d0]">
                          {formatTuition(price, course.pricing?.currency, t("public.availableClasses.free"))}
                        </p>
                      </div>
                      {course.enrollmentCount != null ? (
                        <p className="text-xs text-slate-500">
                          {t("public.availableClasses.students", { count: course.enrollmentCount })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
