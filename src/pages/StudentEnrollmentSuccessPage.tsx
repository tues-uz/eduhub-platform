import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, FileText, User } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { eduhubCourses, eduhubSchedule } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import { useAuthSession } from "@/features/auth/context";
import {
  orderSessionSlotsChronologically,
  resolveEnrollmentSessionTimingStatus,
  resolvePreviewSessionSlots,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { SessionTimingChip } from "@/features/courses/SessionTimingChip";
import { useScheduleAttendanceState } from "@/features/courses/useScheduleAttendanceState";
import {
  buildEnrollmentScheduleSessionSummaries,
  type EnrollmentApplicationPdfData,
  type EnrollmentScheduleSessionSummary,
} from "@/features/enrollment/enrollmentApplicationPdf";
import { scheduleSlotKeyFromParts } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import { formatPaymentMethodLabel } from "@/features/enrollment/enrollmentDocumentConfig";
import { formatDisplayPersonName, formatDisplayTitle } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";

const SESSION_PREFIX = "eduhub_enrollment_success_pdf__";

function sessionStorageKey(courseId: string, emailNorm: string): string {
  return `${SESSION_PREFIX}${encodeURIComponent(courseId)}__${emailNorm}`;
}

type LocationState = { pdfData?: EnrollmentApplicationPdfData };
type PanelTab = "schedule" | "details";
type DetailsSection = "contact" | "payment" | "documents";

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
  return null;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function parseLabeledLine(line: string): { label: string; value: string } | null {
  const idx = line.indexOf(": ");
  if (idx <= 0) return null;
  const label = line.slice(0, idx).trim();
  const value = line.slice(idx + 2).trim();
  if (!label || !value) return null;
  return { label, value };
}

function ValueCell({ value }: { value: string }) {
  if (isHttpUrl(value)) {
    return (
      <a
        href={value.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-1.5 font-medium text-[#3954d0] hover:underline"
      >
        <span className="truncate">{value.trim()}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{value}</span>;
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        !last && "border-b border-zinc-100",
      )}
    >
      <dt className="shrink-0 text-[13px] text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-zinc-900 sm:text-right">
        <ValueCell value={value} />
      </dd>
    </div>
  );
}

function fileLabelFromUrl(url: string): string {
  try {
    const path = new URL(url.trim()).pathname;
    const name = path.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : url.trim();
  } catch {
    return url.trim();
  }
}

function DocumentTile({ label, value }: { label: string; value: string }) {
  const url = isHttpUrl(value);
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3954d0]/8 text-[#3954d0]">
        <FileText className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-zinc-500">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-medium text-zinc-900">
          {url ? fileLabelFromUrl(value) : value}
        </span>
      </span>
      {url ? <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden /> : null}
    </>
  );

  if (url) {
    return (
      <a
        href={value.trim()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3 transition-colors hover:border-[#3954d0]/35 hover:bg-[#3954d0]/[0.03]"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-3">
      {content}
    </div>
  );
}

const StudentEnrollmentSuccessPage = () => {
  const { t } = useTranslation();
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId ? decodeURIComponent(rawCourseId) : undefined;
  const location = useLocation();
  const { user } = useAuthSession();
  const emailNorm = (user.email ?? "").trim().toLowerCase();

  const pdfData = useMemo(
    () => resolvePdfData(courseId, emailNorm, location.state as LocationState | null),
    [courseId, emailNorm, location.state],
  );

  const [teacherName, setTeacherName] = useState(pdfData?.teacherName?.trim() || "");
  const [scheduleSessions, setScheduleSessions] = useState<EnrollmentScheduleSessionSummary[]>(
    () => pdfData?.scheduleSessions ?? [],
  );
  const [scheduleSlots, setScheduleSlots] = useState<SessionSlotLike[]>([]);
  const [tab, setTab] = useState<PanelTab>("schedule");
  const [detailsSection, setDetailsSection] = useState<DetailsSection>("contact");
  const scheduleAttendance = useScheduleAttendanceState(courseId);

  useEffect(() => {
    setTeacherName(pdfData?.teacherName?.trim() || "");
    setScheduleSessions(pdfData?.scheduleSessions ?? []);
  }, [pdfData]);

  useEffect(() => {
    if (!courseId || !isUuid(courseId)) return;

    let cancelled = false;
    Promise.all([
      eduhubCourses.getById(courseId).catch(() => null),
      eduhubSchedule.getProposal(courseId).catch(() => null),
    ]).then(([course, proposal]) => {
      if (cancelled) return;
      const name = course?.lecturer?.fullName?.trim();
      if (name) setTeacherName(name);
      const slots = orderSessionSlotsChronologically(
        resolvePreviewSessionSlots(courseId, course, proposal, true, null),
      );
      const visible = slots.filter((slot) => Boolean(slot.sessionDate?.trim() || slot.title?.trim()));
      setScheduleSlots(visible);
      const rows = buildEnrollmentScheduleSessionSummaries(slots);
      if (rows.length > 0) setScheduleSessions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

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

  const displayTitle = formatDisplayTitle(d.courseTitle) || d.courseTitle;
  const displayTeacher = teacherName ? formatDisplayPersonName(teacherName) || teacherName : "";
  const joinFrom = d.joinFromSessionNumber ?? 1;
  const meetingCount = scheduleSessions.length || d.scheduleSessionCount || 0;

  const contactRows = (
    [
      [t("enrollmentSuccess.fullName"), d.fullName],
      [t("enrollmentSuccess.email"), d.email],
      [t("enrollmentSuccess.phone"), d.phone],
      d.phoneSecondary?.trim()
        ? [t("enrollmentSuccess.additionalPhone"), d.phoneSecondary.trim()]
        : null,
      [t("enrollmentSuccess.address"), d.address.trim()],
    ] as Array<[string, string] | null>
  ).filter((row): row is [string, string] => Boolean(row?.[1]));

  const documentRows = [
    [t("enrollmentSuccess.paymentProof"), d.proofFileName],
    [t("enrollmentSuccess.identification"), d.idFileName],
  ] as const;

  return (
    <div className="min-h-dvh bg-[#f4f5f7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <Link
          to="/dashboard/available-courses"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("enrollmentSuccess.backToCatalog")}
        </Link>

        <div className="mt-5 flex flex-1 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80 sm:mt-6">
          {/* Status */}
          <div className="border-b border-zinc-100 px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                    {t("enrollmentSuccess.applicationReceived")}
                  </h1>
                  <span
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
                  >
                    {t("enrollmentSuccess.pendingReview")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                  {t("enrollmentSuccess.receivedMessageShort")}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {t("enrollmentSuccess.submitted", { date: submittedDate })}
                </p>
              </div>
            </div>
          </div>

          {/* Class summary */}
          <div className="border-b border-zinc-100 px-5 py-5 sm:px-8">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{displayTitle}</h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-zinc-600">
              {displayTeacher ? (
                <p>
                  <span className="text-zinc-400">{t("enrollmentSuccess.teacher")} </span>
                  {displayTeacher}
                </p>
              ) : null}
              <p>
                <span className="text-zinc-400">{t("enrollmentSuccess.tuitionReference")} </span>
                <span className="font-medium tabular-nums text-zinc-800">{d.tuitionLabel}</span>
              </p>
              {meetingCount > 0 ? (
                <p>
                  <span className="text-zinc-400">{t("enrollmentSuccess.scheduleSummary")} </span>
                  {t("enrollmentSuccess.meetingsCount", { count: meetingCount })}
                  {joinFrom > 1
                    ? ` · ${t("enrollmentSuccess.fromMeeting", { n: joinFrom })}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>

          {/* Tabs: only one panel open — keeps the page short */}
          <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 sm:px-8">
            <div
              className="flex gap-1 rounded-lg bg-zinc-100 p-1"
              role="tablist"
              aria-label={t("enrollmentSuccess.applicationSummary")}
            >
              {(
                [
                  ["schedule", t("enrollmentSuccess.scheduleSection")],
                  ["details", t("enrollmentSuccess.applicationSummary")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    tab === id
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-[12rem] flex-1 pb-2" role="tabpanel">
              {tab === "schedule" ? (
                scheduleSlots.length > 0 || scheduleSessions.length > 0 ? (
                  <ul className="max-h-64 overflow-y-auto overscroll-contain sm:max-h-72">
                    {(scheduleSlots.length > 0 ? scheduleSlots : []).map((slot, index) => {
                      const summary =
                        scheduleSessions[index] ??
                        buildEnrollmentScheduleSessionSummaries([slot])[0];
                      const timingStatus = resolveEnrollmentSessionTimingStatus(
                        slot,
                        scheduleAttendance.heldSlotKeys,
                        scheduleAttendance.activeSlotKeys,
                      );
                      return (
                        <li
                          key={scheduleSlotKeyFromParts(slot) || `${summary?.dateLabel}-${index}`}
                          className={cn(
                            "flex items-start justify-between gap-4 border-b border-zinc-100 py-2.5 last:border-0",
                            timingStatus === "finished" && "opacity-75",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col items-start gap-1">
                              <SessionTimingChip status={timingStatus} />
                              <p className="truncate text-sm font-medium text-zinc-900">
                                {summary?.title?.trim() ||
                                  slot.title?.trim() ||
                                  t("enrollmentSuccess.meetingFallback", { n: index + 1 })}
                              </p>
                            </div>
                            <p className="mt-0.5 text-[13px] text-zinc-500">
                              {[summary?.weekdayLabel, summary?.dateLabel].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          {summary?.timeLabel ? (
                            <span className="shrink-0 text-[13px] font-medium tabular-nums text-zinc-700">
                              {summary.timeLabel}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                    {scheduleSlots.length === 0
                      ? scheduleSessions.map((session, index) => (
                          <li
                            key={`${session.dateLabel}-${index}`}
                            className="flex items-baseline justify-between gap-4 border-b border-zinc-100 py-2.5 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900">
                                {session.title?.trim() ||
                                  t("enrollmentSuccess.meetingFallback", { n: index + 1 })}
                              </p>
                              <p className="text-[13px] text-zinc-500">
                                {[session.weekdayLabel, session.dateLabel].filter(Boolean).join(", ")}
                              </p>
                            </div>
                            {session.timeLabel ? (
                              <span className="shrink-0 text-[13px] font-medium tabular-nums text-zinc-700">
                                {session.timeLabel}
                              </span>
                            ) : null}
                          </li>
                        ))
                      : null}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-zinc-400">
                    {t("enrollmentSuccess.scheduleUnavailable")}
                  </p>
                )
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {(
                      [
                        ["contact", t("enrollmentSuccess.yourDetails")],
                        ["payment", t("enrollmentSuccess.paymentSection")],
                        ["documents", t("enrollmentSuccess.documentsSection")],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDetailsSection(id)}
                        className={cn(
                          "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                          detailsSection === id
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {detailsSection === "contact" ? (
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50">
                      <div className="flex items-center gap-2 border-b border-zinc-100 bg-white px-4 py-3">
                        <User className="h-4 w-4 text-zinc-400" aria-hidden />
                        <p className="text-sm font-medium text-zinc-900">
                          {t("enrollmentSuccess.yourDetails")}
                        </p>
                      </div>
                      <dl>
                        {contactRows.map(([label, value], i) => (
                          <InfoRow
                            key={label}
                            label={label}
                            value={value}
                            last={i === contactRows.length - 1}
                          />
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  {detailsSection === "payment" ? (
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/50">
                      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-white px-4 py-3">
                        <p className="text-sm font-medium text-zinc-900">
                          {t("enrollmentSuccess.paymentSection")}
                        </p>
                        {d.paymentMethod ? (
                          <span className="rounded-full bg-[#3954d0]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#3954d0]">
                            {formatPaymentMethodLabel(d.paymentMethod)}
                          </span>
                        ) : null}
                      </div>
                      <dl>
                        {d.paymentDetailLines.map((line, i) => {
                          const parsed = parseLabeledLine(line);
                          const last = i === d.paymentDetailLines.length - 1;
                          if (!parsed) {
                            return (
                              <p
                                key={i}
                                className={cn(
                                  "px-4 py-3 text-sm leading-relaxed text-zinc-600",
                                  !last && "border-b border-zinc-100",
                                )}
                              >
                                {line}
                              </p>
                            );
                          }
                          return (
                            <InfoRow
                              key={`${parsed.label}-${i}`}
                              label={parsed.label}
                              value={parsed.value}
                              last={last}
                            />
                          );
                        })}
                      </dl>
                    </div>
                  ) : null}

                  {detailsSection === "documents" ? (
                    <div className="space-y-2.5">
                      {documentRows.map(([label, value]) => (
                        <DocumentTile key={label} label={label} value={value} />
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-auto border-t border-zinc-100 px-5 py-4 sm:px-8 sm:py-5">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button
                asChild
                className="h-11 flex-1 rounded-xl text-sm font-medium shadow-none hover:bg-[#2f47b3]"
                style={{ backgroundColor: "#3954d0" }}
              >
                <Link to="/dashboard/payment">{t("enrollmentSuccess.trackPayment")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 flex-1 rounded-xl border-zinc-200 bg-white text-sm font-medium text-zinc-700 shadow-none"
              >
                <Link to="/dashboard/available-courses">{t("enrollmentSuccess.browseMore")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollmentSuccessPage;
