import { useCallback, useEffect, useId, useRef, useState } from "react";
import { FileCheck, Trash2, Upload } from "@/lib/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  adminPayrollProofStore,
  hasPayrollProofFile,
  PAYROLL_INFORMATION_MAX_CHARS,
  PAYROLL_PROOF_MAX_FILE_BYTES,
  payrollProofKey,
  usePayrollProofMap,
} from "@/features/admin/data/adminPayrollProofStore";

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type Props = {
  className: string;
  course: string;
  /** When true, show top divider for use inside a payroll card. */
  embedded?: boolean;
  /** Shown in instructor notification & submission log. */
  requestId?: string;
  instructorName?: string;
  instructorEmail?: string;
  /** e.g. collected / outstanding / est. payout — from payment rows. */
  payrollSummary?: string;
};

export function PayrollInstructorProofPanel({
  className,
  course,
  embedded = false,
  requestId,
  instructorName,
  instructorEmail,
  payrollSummary,
}: Props) {
  const { t } = useTranslation();
  const proofMap = usePayrollProofMap();
  const key = payrollProofKey(className, course);
  const bundle = proofMap[key];
  const hasFile = hasPayrollProofFile(bundle);
  const inputRef = useRef<HTMLInputElement>(null);
  const infoFieldId = useId();
  const infoHintId = useId();
  const proofInputId = useId();
  const [notesDraft, setNotesDraft] = useState(bundle?.informationNotes ?? "");

  useEffect(() => {
    setNotesDraft(bundle?.informationNotes ?? "");
  }, [key, bundle?.informationNotes]);

  const saveNotes = () => {
    void adminPayrollProofStore.setInformationNotes(className, course, notesDraft, requestId);
    toast.success(t("admin.components.payrollProofPanel.toast.informationSaved"));
  };

  const handleProofFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      const result = await adminPayrollProofStore.upload(className, course, file, requestId);
      if (result.ok) {
        toast.success(t("admin.components.payrollProofPanel.toast.proofSaved"), { description: file.name });
      } else {
        toast.error(t("admin.components.payrollProofPanel.toast.uploadFailed"), { description: "reason" in result ? result.reason : "Please try again." });
      }
    },
    [className, course, requestId],
  );

  const onProofInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      void handleProofFile(file);
    },
    [handleProofFile],
  );

  const onApprove = async () => {
    const ok = await adminPayrollProofStore.approve(className, course, requestId);
    if (ok) toast.success(t("admin.components.payrollProofPanel.toast.payoutApproved"));
    else toast.error(t("admin.components.payrollProofPanel.toast.uploadFirst"));
  };

  const handleSubmitAll = async () => {
    await adminPayrollProofStore.setInformationNotes(className, course, notesDraft, requestId);
    const b = adminPayrollProofStore.get(className, course);
    if (!hasPayrollProofFile(b)) {
      toast.error(t("admin.components.payrollProofPanel.toast.uploadBeforeSubmit"));
      return;
    }
    if (b.approvedAt) {
      toast.success(t("admin.components.payrollProofPanel.toast.changesSaved"));
      return;
    }
    const approved = await adminPayrollProofStore.approve(className, course, requestId);
    if (!approved) {
      toast.error(t("admin.components.payrollProofPanel.toast.approveFailed"));
      return;
    }
    toast.success(t("admin.components.payrollProofPanel.toast.submittedApproved"));
  };

  const onRemove = async () => {
    await adminPayrollProofStore.remove(className, course, requestId);
    toast.message(t("admin.components.payrollProofPanel.toast.fileRemoved"));
  };

  const proofMaxMb = Math.round(PAYROLL_PROOF_MAX_FILE_BYTES / (1024 * 1024));

  return (
    <div className={embedded ? "mt-4 border-t border-slate-100 pt-4" : "space-y-6"}>
      <div className="space-y-2">
        <Label htmlFor={infoFieldId} className="text-slate-800">
          Information & recommendations
        </Label>
        <p id={infoHintId} className="text-xs leading-relaxed text-slate-500">
          Optional. Bank reference, period, rate notes, etc. When you submit payout proof, this text can be included in
          the instructor&apos;s in-app notification.
        </p>
        <Textarea
          id={infoFieldId}
          aria-describedby={infoHintId}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value.slice(0, PAYROLL_INFORMATION_MAX_CHARS))}
          placeholder={t("admin.components.payrollProofPanel.informationPlaceholder")}
          className="min-h-[100px] resize-y bg-white text-slate-900 border-slate-200"
          rows={4}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 tabular-nums">
            {notesDraft.length} / {PAYROLL_INFORMATION_MAX_CHARS}
          </span>
          <Button type="button" variant="outline" size="sm" className="font-normal" onClick={saveNotes}>
            Save information
          </Button>
        </div>
      </div>

      <div className={embedded ? "" : "border-t border-slate-100 pt-6"}>
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-zinc-500" aria-hidden />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Bank transfer receipt
          </h3>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Upload the bank transfer confirmation for the instructor payout (screenshot or PDF). Not student course
          certificates — instructors only see this after you submit payout proof below.
        </p>

        <div className="mt-5">
          {!hasFile ? (
            <label
              htmlFor={proofInputId}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer.files?.[0];
                void handleProofFile(f);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:gap-4 sm:py-12",
                "border-zinc-300 bg-gradient-to-b from-white to-zinc-50/90",
                "hover:border-[#3954d0]/45 hover:from-zinc-50/50 hover:to-[#3954d0]/[0.04]",
                "focus-within:border-[#3954d0]/55 focus-within:ring-2 focus-within:ring-[#3954d0]/20",
              )}
            >
              <input
                ref={inputRef}
                id={proofInputId}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onProofInputChange}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3954d0]/12">
                <Upload className="h-6 w-6 text-[#3954d0]" aria-hidden />
              </div>
              <div className="max-w-md space-y-1 px-2">
                <p className="text-sm font-medium text-zinc-900">
                  Drop a file here or <span className="text-[#3954d0]">{t("admin.components.payrollProofPanel.browse")}</span>
                </p>
                <p className="text-xs leading-relaxed text-zinc-500">
                  Bank receipt only (PNG, JPG, WebP, or PDF · max {proofMaxMb} MB). Do not upload course certificates.
                </p>
              </div>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <FileCheck className="h-5 w-5 text-emerald-700" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{bundle!.fileName}</p>
                    <p className="text-xs text-zinc-500">
                      Uploaded {formatShortDate(bundle!.uploadedAt!)} · attached
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-stretch sm:self-center"
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </Button>
              </div>

              {bundle?.approvedAt ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-800">
                  <FileCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Approved {formatShortDate(bundle.approvedAt)}
                </div>
              ) : embedded ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="w-full bg-slate-900 font-normal text-white hover:bg-slate-800"
                  onClick={() => void onApprove()}
                >
                  Approve payout record
                </Button>
              ) : (
                <p className="text-xs text-zinc-500">
                  Use <span className="font-medium text-zinc-700">{t("admin.components.payrollProofPanel.submitPayoutProof")}</span> below to save notes and
                  approve this record.
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => void onRemove()}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remove file
              </Button>
            </div>
          )}
        </div>
      </div>

      {!embedded ? (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-lg text-xs leading-relaxed text-slate-500">
              <span className="font-medium text-slate-700">{t("common.submit")}</span> saves your information, checks that a transfer
              file is attached, then marks this payout as approved for your local records (replace with server workflow
              when API is ready).
            </p>
            <Button
              type="button"
              size="lg"
              disabled={!hasFile}
              className="w-full shrink-0 rounded-xl bg-[#3954d0] px-8 text-[15px] font-semibold text-white shadow-sm hover:bg-[#3954d0]/92 disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
              onClick={() => void handleSubmitAll()}
            >
              {bundle?.approvedAt ? t("admin.settings.saveChanges") : "Submit payout proof"}
            </Button>
          </div>
          {!hasFile ? (
            <p className="mt-2 text-[11px] text-amber-800/90">{t("admin.components.payrollProofPanel.attachToEnable")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
