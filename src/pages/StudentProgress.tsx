import { useTranslation } from "react-i18next";
import { BarChart3, Target, BookOpen, Award } from "@/lib/icons";
import { Progress } from "@/components/ui/progress";
import {
  useStudentCertificatesQuery,
  useStudentCoursesQuery,
} from "@/features/student/hooks/useStudentQueries";

const StudentProgress = () => {
  const { t } = useTranslation();
  const { data: courses = [] } = useStudentCoursesQuery();
  const { data: certificates = [] } = useStudentCertificatesQuery();

  const overallProgress = courses.length
    ? Math.round(courses.reduce((sum, c) => sum + (typeof c.progress === "number" ? c.progress : 0), 0) / courses.length)
    : 0;
  const completedCount = courses.filter((c) => c.progress >= 100).length;
  const avgScore = certificates.length
    ? Math.round(certificates.reduce((sum, cert) => sum + (cert.totalFinalScore ?? 0), 0) / certificates.length)
    : null;

  return (
    <div className="container mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="mb-8">
            <p className="text-foreground/70 text-sm">{t("progressPage.subtitle")}</p>
          </div>
          {/* Summary stats row */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200/50 bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 opacity-90" />
                <span className="text-sm font-medium opacity-90">{t("progressPage.overallCompletion")}</span>
              </div>
              <p className="text-3xl font-bold">{overallProgress}%</p>
              <Progress value={overallProgress} className="mt-2 h-2 bg-white/20" />
            </div>
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-foreground/60" />
                <span className="text-sm font-medium text-foreground/70">{t("progressPage.classesCompleted")}</span>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {completedCount} <span className="text-lg font-normal text-foreground/60">/ {courses.length}</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-foreground/60" />
                <span className="text-sm font-medium text-foreground/70">{t("progressPage.avgScore")}</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{avgScore != null ? `${avgScore}%` : "—"}</p>
            </div>
          </div>

          {/* By course - full width */}
          <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm">
            <h2 className="mb-6 font-semibold text-foreground flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
              <BarChart3 className="h-5 w-5" />
              {t("progressPage.byClass")}
            </h2>
            {courses.length === 0 ? (
              <p className="text-sm text-foreground/50">{t("progressPage.empty")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                    <p className="mb-2 text-sm font-medium text-foreground truncate" title={c.title}>{c.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <Progress value={c.progress} className="h-2 flex-1 bg-gray-200" />
                      <span className="text-sm font-semibold text-foreground tabular-nums">{c.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
    </div>
  );
};

export default StudentProgress;
