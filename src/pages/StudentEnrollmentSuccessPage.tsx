import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, FileDown, Library } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import {
  enrollmentApplicationStore,
  type EnrollmentApplicationRecord,
} from "@/features/enrollment/enrollmentApplicationStore";
import {
  downloadEnrollmentApplicationPdf,
  enrollmentRecordToPdfData,
  type EnrollmentApplicationPdfData,
} from "@/features/enrollment/enrollmentApplicationPdf";
const SESSION_PREFIX = "eduhub_enrollment_success_pdf__";

function sessionStorageKey(courseId: string, emailNorm: string): string {
  return `${SESSION_PREFIX}${encodeURIComponent(courseId)}__${emailNorm}`;
}

type LocationState = { pdfData?: EnrollmentApplicationPdfData };

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">{title}</h2>
      <div className="mt-4 space-y-3 text-sm text-zinc-800">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 font-medium text-zinc-900 sm:text-right">{value}</span>
    </div>
  );
}

function resolvePdfData(
  courseId: string | undefined,
  emailNorm: string,
  state: LocationState | null,
): EnrollmentApplicationPdfData | null {
  if (!courseId) return null;
  if (state?.pdfData) return state.pdfData;
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(courseId, emailNorm));
    if (raw) {
      const parsed = JSON.parse(raw) as EnrollmentApplicationPdfData;
      if (parsed?.courseId === courseId) return parsed;
    }
  } catch {
    /* ignore */
  }
  const pending = enrollmentApplicationStore.findPendingForCourseAndEmail(courseId, emailNorm);
  if (pending) return enrollmentRecordToPdfData(pending);
  return null;
}

function findRecordForCourse(courseId: string | undefined, emailNorm: string): EnrollmentApplicationRecord | undefined {
  if (!courseId) return undefined;
  return enrollmentApplicationStore
    .list()
    .filter((r) => r.courseId === courseId && r.applicantEmailNorm === emailNorm)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

const StudentEnrollmentSuccessPage = () => {
  const { t } = useTranslation();
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId ? decodeURIComponent(rawCourseId) : undefined;
  const location = useLocation();
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();

  const pdfData = useMemo(
    () => resolvePdfData(courseId, emailNorm, location.state as LocationState | null),
    [courseId, emailNorm, location.state],
  );

  const latestRecord = useMemo(
    () => findRecordForCourse(courseId, emailNorm),
    [courseId, emailNorm],
  );

  const statusLine =
    latestRecord?.status === "PENDING"
      ? t("enrollmentSuccess.pendingReview")
      : latestRecord?.status ?? t("enrollmentSuccess.submittedStatus");

  if (!courseId) {
    return <Navigate to="/dashboard/available-courses" replace />;
  }

  if (!pdfData) {
    return (
      <Navigate to={`/dashboard/available-courses/enroll/${encodeURIComponent(courseId)}`} replace />
    );
  }

  const d = pdfData;
  const submittedDate = (() => {
    try {
      return new Date(d.submittedAtIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return d.submittedAtIso;
    }
  })();

  return (
    <div className="min-h-dvh bg-zinc-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="min-h-dvh w-full pb-24">
        <div className="pt-0">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-xl items-start justify-between gap-4 px-4 py-3 sm:items-center sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{t("enrollmentSuccess.enrollment")}</p>
                <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
                  {t("enrollmentSuccess.applicationSent")}
                </h1>
              </div>
              <Link
                to="/dashboard/available-courses"
                title={t("enrollmentSuccess.backToAvailableAria")}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("enrollmentSuccess.backToCatalog")}</span>
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-xl px-4 pt-6 sm:px-6">
            <div className="mb-6 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-7 w-7 text-emerald-700" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-emerald-950">{t("enrollmentSuccess.allSet")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-emerald-900/85">
                    {t("enrollmentSuccess.receivedMessage")}
                  </p>
                  <p className="mt-3 text-xs font-medium text-emerald-800/90">
                    {t("enrollmentSuccess.submitted", { date: submittedDate })}
                    {latestRecord ? (
                      <>
                        {" "}
                        · <span className="tabular-nums">{statusLine}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <SectionCard title={t("enrollmentSuccess.courseSection")}>
                <Row label={t("enrollmentSuccess.title")} value={d.courseTitle} />
                <Row label={t("enrollmentSuccess.classReference")} value={d.courseId} />
                <Row label={t("enrollmentSuccess.tuitionReference")} value={d.tuitionLabel} />
              </SectionCard>

              <SectionCard title={t("enrollmentSuccess.yourDetails")}>
                <Row label={t("enrollmentSuccess.fullName")} value={d.fullName} />
                <Row label={t("enrollmentSuccess.email")} value={d.email} />
                <Row label={t("enrollmentSuccess.phone")} value={d.phone} />
                {d.phoneSecondary?.trim() ? (
                  <Row label={t("enrollmentSuccess.additionalPhone")} value={d.phoneSecondary.trim()} />
                ) : null}
                <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                  <span className="text-zinc-500">{t("enrollmentSuccess.address")}</span>
                  <p className="mt-1 whitespace-pre-wrap font-medium text-zinc-900">{d.address.trim()}</p>
                </div>
              </SectionCard>

              <SectionCard title={t("enrollmentSuccess.paymentSection")}>
                <ul className="list-inside list-disc space-y-2 text-zinc-800">
                  {d.paymentDetailLines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title={t("enrollmentSuccess.documentsSection")}>
                <Row label={t("enrollmentSuccess.paymentProof")} value={d.proofFileName} />
                <Row label={t("enrollmentSuccess.identification")} value={d.idFileName} />
              </SectionCard>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-zinc-300 bg-white"
                onClick={() => void downloadEnrollmentApplicationPdf(d)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {t("enrollmentSuccess.downloadSummary")}
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-xl border-zinc-300 bg-white" asChild>
                <Link to="/dashboard/payment">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t("enrollmentSuccess.paymentDetails")}
                </Link>
              </Button>
              <Button asChild className="h-11 rounded-xl shadow-sm" style={{ backgroundColor: "#3954d0" }}>
                <Link to="/dashboard/available-courses">
                  <Library className="mr-2 h-4 w-4" />
                  {t("enrollmentSuccess.browseMore")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentEnrollmentSuccessPage;
