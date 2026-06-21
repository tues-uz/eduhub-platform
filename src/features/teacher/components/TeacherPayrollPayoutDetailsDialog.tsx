import type { ReactNode } from "react";
import { Download, ExternalLink, FileCheck } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  canInstructorViewTransferProof,
  isReleasedInstructorTransferProof,
  looksLikeCourseCertificateFileName,
  type PayrollProofRecord,
} from "@/features/admin/data/adminPayrollProofStore";
import type { InstructorPayrollRequestRecord } from "@/features/teacher/data/instructorPayrollRequestStore";
import { formatThousandsInText } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function formatShortDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

type TeacherPayrollPayoutDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSection: string;
  course: string;
  submission: InstructorPayrollRequestRecord | undefined;
  proof: PayrollProofRecord | undefined;
};

export function TeacherPayrollPayoutDetailsDialog({
  open,
  onOpenChange,
  classSection,
  course,
  submission,
  proof,
}: TeacherPayrollPayoutDetailsDialogProps) {
  const { t } = useTranslation();
  const canShowTransferFile = canInstructorViewTransferProof(submission, proof);
  const releasedTransfer = isReleasedInstructorTransferProof(proof);
  const maybeWrongFile =
    canShowTransferFile && looksLikeCourseCertificateFileName(proof?.fileName ?? "");
  const isPdf = proof?.mimeType?.toLowerCase().includes("pdf");
  const isImage = proof?.mimeType?.toLowerCase().startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] max-w-lg overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("teacher.payrollPayout.title")}</DialogTitle>
          <DialogDescription>
            {classSection} · {course}. Bank transfer details come from EduHub admin after your payroll request is
            approved — not student course certificates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-1">
          {submission ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Your submission
              </h3>
              <dl className="space-y-2">
                <DetailRow
                  label="Status"
                  value={
                    submission.status === "approved" ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                        Approved
                      </span>
                    ) : submission.status === "rejected" ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-900">
                        Not approved
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                        Pending review
                      </span>
                    )
                  }
                />
                {submission.periodLabel ? (
                  <DetailRow label="Schedule month" value={submission.periodLabel} />
                ) : null}
                {submission.requestedPayout ? (
                  <DetailRow
                    label="Requested payout"
                    value={formatThousandsInText(submission.requestedPayout)}
                  />
                ) : null}
                {submission.payoutDetails ? (
                  <DetailRow label="Payout details" value={submission.payoutDetails} />
                ) : null}
                {submission.resolvedAt ? (
                  <DetailRow label="Reviewed" value={formatShortDate(submission.resolvedAt)} />
                ) : null}
                {submission.reviewedByCode ? (
                  <DetailRow label="Admin reference" value={submission.reviewedByCode} />
                ) : null}
                {submission.adminNote ? (
                  <DetailRow label="Admin note" value={submission.adminNote} />
                ) : null}
              </dl>
              {submission.summary ? (
                <p className="text-xs leading-relaxed text-slate-600 border-t border-slate-200/80 pt-2 mt-2">
                  {submission.summary}
                </p>
              ) : null}
            </section>
          ) : (
            <p className="text-sm text-slate-600">No payroll submission on file for this class yet.</p>
          )}

          {proof?.informationNotes?.trim() ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Payout notes from admin
              </h3>
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {proof.informationNotes.trim()}
              </p>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Bank transfer receipt (from admin)
            </h3>
            {canShowTransferFile ? (
              <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                {maybeWrongFile ? (
                  <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-950">
                    This filename looks like a course certificate. If it is not your bank receipt, ask admin to replace
                    it under Payroll → transfer proof.
                  </p>
                ) : null}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <FileCheck className="h-5 w-5 text-emerald-700" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">Uploaded by EduHub admin</p>
                    <p className="truncate text-xs text-slate-600">{proof!.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {releasedTransfer
                        ? `Released ${formatShortDate(proof!.approvedAt)}`
                        : `Attached ${formatShortDate(proof!.uploadedAt)}`}
                    </p>
                  </div>
                </div>

                {isPdf && proof!.dataUrl ? (
                  <iframe
                    title="Bank transfer receipt PDF"
                    src={proof!.dataUrl}
                    className="h-[min(280px,42vh)] w-full rounded-lg border border-slate-200 bg-white"
                  />
                ) : null}

                {isImage && proof!.dataUrl ? (
                  <img
                    src={proof!.dataUrl}
                    alt="Bank transfer receipt from admin"
                    className="max-h-64 w-full rounded-lg border border-slate-200 object-contain bg-white"
                  />
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={proof!.dataUrl} download={proof!.fileName} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Download PDF
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={proof!.dataUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      {isPdf ? "Open PDF in new tab" : "Open receipt"}
                    </a>
                  </Button>
                </div>
              </div>
            ) : submission?.status === "approved" ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                Your payroll request was approved. The bank transfer receipt (PDF or image) will appear here once
                admin uploads it under <span className="font-medium">Admin → Payroll</span> → your request →{" "}
                <span className="font-medium">Transfer proof</span>. Scroll this dialog to preview it when it is ready.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Available after admin approves your payroll and submits the bank transfer receipt to you.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
