import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, Download, Loader2, Lock } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/features/auth/context";
import { downloadCourseCertificatePdf } from "@/features/courses/courseCertificatePdf";
import {
  COURSE_CERTIFICATES_CHANGED,
  listCertificatesForStudent,
  type CourseCertificateRecord,
} from "@/features/courses/courseCertificatesStorage";
import { hasSubmittedBothReviews } from "@/features/student/courseReviewsStorage";

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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

  const certificates = useMemo((): CourseCertificateRecord[] => {
    void tick;
    return listCertificatesForStudent(emailNorm);
  }, [emailNorm, tick]);

  return (
    <div className="w-full max-w-3xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mb-8">
        <p className="text-foreground/70 text-sm">
          Certificates your instructor publishes after final scores. Submit instructor and Edu Hub feedback on
          your class completion page before downloading the PDF.
        </p>
        <div className="mt-4">
          <span className="rounded-full bg-green-50 px-4 py-2 text-green-700 font-medium text-sm">
            {certificates.length} certificate{certificates.length === 1 ? "" : "s"} earned
          </span>
        </div>
      </div>
      {certificates.length === 0 ? (
        <p className="text-sm text-foreground/70 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center max-w-lg">
          No certificates yet. They appear here after your instructor saves your final score and publishes your
          certificate from the class Grades tab.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {certificates.map((c) => {
            const reviewsComplete = hasSubmittedBothReviews(c.courseId, emailNorm);
            return (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <Award className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground">{c.courseTitle}</h3>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">{c.certificateNumber}</p>
              <p className="text-sm text-foreground/60 mt-2 flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                Final score {c.totalFinalScore}%
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-foreground/60">
                  Issued {formatDate(c.issuedAt)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full shrink-0"
                  disabled={!reviewsComplete || downloadingId === c.id}
                  onClick={() => {
                    setDownloadingId(c.id);
                    void downloadCourseCertificatePdf(c)
                      .then(() => toast.success("Certificate downloaded"))
                      .catch((e) =>
                        toast.error(e instanceof Error ? e.message : "Could not generate certificate PDF"),
                      )
                      .finally(() => setDownloadingId(null));
                  }}
                >
                  {downloadingId === c.id ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  ) : reviewsComplete ? (
                    <Download className="mr-1.5 h-4 w-4" aria-hidden />
                  ) : (
                    <Lock className="mr-1.5 h-4 w-4" aria-hidden />
                  )}
                  {reviewsComplete ? "Download" : "Locked"}
                </Button>
              </div>
              {!reviewsComplete ? (
                <p className="mt-3 text-xs leading-relaxed text-amber-800/90">
                  Submit{" "}
                  <Link
                    to={`/dashboard/courses/${encodeURIComponent(c.courseId)}/congrats`}
                    className="font-medium underline underline-offset-2"
                  >
                    class feedback
                  </Link>{" "}
                  to unlock download.
                </p>
              ) : null}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCertificates;
