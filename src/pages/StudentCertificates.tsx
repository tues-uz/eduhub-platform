import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, GraduationCap, Loader2, Lock } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { eduhubCompletion } from "@/api/eduhubClient";
import type { CourseCertificateResponse } from "@/api/eduhubTypes";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import { downloadCourseCertificatePdf } from "@/features/courses/courseCertificatePdf";
import {
  COURSE_CERTIFICATES_CHANGED,
  listCertificatesForStudent,
  type CourseCertificateRecord,
} from "@/features/courses/courseCertificatesStorage";
import { hasSubmittedBothReviews } from "@/features/student/courseReviewsStorage";
import { formatDisplayPersonName } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

type DisplayCertificate = CourseCertificateRecord | CourseCertificateResponse;

function CertificateCard({
  certificate,
  reviewsComplete,
  downloading,
  onDownload,
}: {
  certificate: DisplayCertificate;
  reviewsComplete: boolean;
  downloading: boolean;
  onDownload: () => void;
}) {
  const instructorLabel = certificate.instructorName?.trim()
    ? formatDisplayPersonName(certificate.instructorName)
    : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-zinc-100/80 transition-shadow hover:shadow-md">
      <div className="relative border-b border-zinc-100 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-amber-300/40"
            style={{ background: "linear-gradient(45deg, #ffed93 0%, #b89900 100%)" }}
          >
            <GraduationCap className="size-6 text-[#5c4a00]" aria-hidden />
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
              reviewsComplete
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                : "bg-amber-50 text-amber-900 ring-amber-200/80",
            )}
          >
            {reviewsComplete ? "Ready" : "Feedback required"}
          </span>
        </div>
        <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-snug tracking-tight text-zinc-900">
          {certificate.courseTitle}
        </h3>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500">
          {certificate.certificateNumber}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            Final score
          </p>
          <p className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
            {certificate.totalFinalScore}
            <span className="text-lg font-semibold text-zinc-900">%</span>
          </p>
        </div>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-zinc-500">Issued</dt>
            <dd className="text-right font-semibold tabular-nums text-zinc-800">
              {formatDate(certificate.issuedAt)}
            </dd>
          </div>
          {instructorLabel ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-zinc-500">Instructor</dt>
              <dd className="min-w-0 truncate text-right font-semibold text-zinc-800">{instructorLabel}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-auto pt-5">
          {reviewsComplete ? (
            <Button
              type="button"
              className="h-10 w-full rounded-full gap-2"
              style={{ backgroundColor: "#3954d0" }}
              disabled={downloading}
              onClick={onDownload}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Download PDF
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-full gap-2 border-zinc-200 text-zinc-600"
                disabled
              >
                <Lock className="h-4 w-4" aria-hidden />
                Download locked
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                <Link
                  to={`/dashboard/courses/${encodeURIComponent(certificate.courseId)}/congrats`}
                  className="font-medium text-zinc-700 underline-offset-2 hover:underline"
                >
                  Class completion page
                </Link>{" "}
                — submit feedback to download.
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

const StudentCertificates = () => {
  const { user } = useAuthSession();
  const emailNorm = user.email.trim().toLowerCase();
  const [tick, setTick] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(COURSE_CERTIFICATES_CHANGED, bump);
    return () => window.removeEventListener(COURSE_CERTIFICATES_CHANGED, bump);
  }, []);

  const certificatesQuery = useQuery({
    queryKey: ["student", "certificates"],
    queryFn: eduhubCompletion.myCertificates,
  });

  const localDemoCertificates = useMemo(() => {
    void tick;
    return listCertificatesForStudent(emailNorm).filter((c) => !isUuid(c.courseId));
  }, [emailNorm, tick]);

  const certificates = useMemo(
    (): DisplayCertificate[] => [...(certificatesQuery.data ?? []), ...localDemoCertificates],
    [certificatesQuery.data, localDemoCertificates],
  );

  const readyCount = useMemo(
    () =>
      certificates.filter((c) =>
        "reviewsComplete" in c ? c.reviewsComplete : hasSubmittedBothReviews(c.courseId, emailNorm),
      ).length,
    [certificates, emailNorm],
  );

  return (
    <div className="w-full max-w-7xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-8">
        <div className="space-y-1 text-sm leading-relaxed text-foreground/70">
          <p>Certificates your instructor publishes after final scores.</p>
          <p>Submit instructor and Edu Hub feedback on your class completion page before downloading the PDF.</p>
        </div>
        {!certificatesQuery.isLoading && certificates.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/80">
              {certificates.length} certificate{certificates.length === 1 ? "" : "s"} earned
            </span>
            {readyCount < certificates.length ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-200/80">
                {certificates.length - readyCount} awaiting feedback
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {certificatesQuery.isLoading ? (
        <p className="text-sm text-foreground/60">Loading certificates…</p>
      ) : certificatesQuery.isError ? (
        <p className="text-sm text-red-600 rounded-xl border border-red-100 bg-red-50 px-4 py-4">
          Could not load certificates. Try again later.
        </p>
      ) : certificates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <Award className="h-7 w-7 text-zinc-400" aria-hidden />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-900">No certificates yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            They appear here after your instructor saves your final score and publishes your certificate from
            the class Grades tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {certificates.map((c) => {
            const reviewsComplete =
              "reviewsComplete" in c ? c.reviewsComplete : hasSubmittedBothReviews(c.courseId, emailNorm);
            return (
              <CertificateCard
                key={c.id}
                certificate={c}
                reviewsComplete={reviewsComplete}
                downloading={downloadingId === c.id}
                onDownload={() => {
                  setDownloadingId(c.id);
                  void downloadCourseCertificatePdf(c as CourseCertificateRecord)
                    .then(() => toast.success("Certificate downloaded"))
                    .catch((e) =>
                      toast.error(e instanceof Error ? e.message : "Could not generate certificate PDF"),
                    )
                    .finally(() => setDownloadingId(null));
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCertificates;
