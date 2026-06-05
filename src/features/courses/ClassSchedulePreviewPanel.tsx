import { useMemo } from "react";
import { CalendarDays, Clock } from "@/lib/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseResponse, ScheduleProposalResponse } from "@/api/eduhubTypes";
import type { TeacherCourse } from "@/features/teacher/types";
import { isUuid } from "@/api/utils";
import { cn } from "@/lib/utils";
import {
  buildScheduleMonthTabs,
  classScheduleStatusHint,
  formatClassDateLabel,
  formatSessionTimeLabel,
  paymentMonthsToScheduleTab,
  resolvePreviewSessionSlots,
  scheduleTabToPaymentMonths,
  orderSessionSlotsChronologically,
  resolveEnrollmentSessionTimingStatus,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { useScheduleAttendanceState } from "@/features/courses/useScheduleAttendanceState";
import { SessionTimingChip } from "@/features/courses/SessionTimingChip";
import { formatDisplayTitle } from "@/lib/formatPersonName";

type PaymentMonth = 1 | 2 | 3;

type Props = {
  courseId: string | undefined;
  apiCourse: CourseResponse | null;
  scheduleProposal: ScheduleProposalResponse | null;
  teacherCourse: TeacherCourse | null;
  /** Which schedule month tab is open (m1 / m2 / m3). */
  viewingMonth?: PaymentMonth;
  onViewingMonthChange?: (month: PaymentMonth) => void;
  /** Months checked in the payment row — tabs show a paid indicator when set. */
  selectedPaymentMonths?: ReadonlySet<PaymentMonth>;
  /** When true, helper copy references month checkboxes above the schedule. */
  linkPaymentMonths?: boolean;
  /** Schedule rows with ended attendance QR (Finished chip). */
  heldSlotKeys?: ReadonlySet<string>;
  /** Schedule rows with a live attendance QR (In progress chip). */
  activeSlotKeys?: ReadonlySet<string>;
  className?: string;
};

export function ClassSchedulePreviewPanel({
  courseId,
  apiCourse,
  scheduleProposal,
  teacherCourse,
  viewingMonth,
  onViewingMonthChange,
  selectedPaymentMonths,
  linkPaymentMonths = false,
  heldSlotKeys,
  activeSlotKeys,
  className,
}: Props) {
  const isTeacher = Boolean(courseId?.startsWith("teacher_"));
  const isApiCourse = Boolean(courseId && isUuid(courseId) && !isTeacher);
  const attendanceFromHook = useScheduleAttendanceState(courseId);
  const effectiveHeldSlotKeys = heldSlotKeys ?? attendanceFromHook.heldSlotKeys;
  const effectiveActiveSlotKeys = activeSlotKeys ?? attendanceFromHook.activeSlotKeys;

  const sessionSlotsPreview = useMemo(() => {
    if (!courseId) return [] as SessionSlotLike[];
    const raw = resolvePreviewSessionSlots(
      courseId,
      apiCourse,
      scheduleProposal,
      isApiCourse,
      teacherCourse,
    );
    return orderSessionSlotsChronologically(raw);
  }, [courseId, apiCourse, scheduleProposal, teacherCourse, isApiCourse]);

  const scheduleMonthTabs = useMemo(
    () => buildScheduleMonthTabs(sessionSlotsPreview),
    [sessionSlotsPreview],
  );

  const monthSessionOffsets = useMemo(() => {
    const n0 = scheduleMonthTabs.find((tab) => tab.value === "m1")?.slots.length ?? 0;
    const n1 = scheduleMonthTabs.find((tab) => tab.value === "m2")?.slots.length ?? 0;
    return { m1: 0, m2: n0, m3: n0 + n1 };
  }, [scheduleMonthTabs]);

  const statusHint = classScheduleStatusHint(
    courseId,
    isApiCourse,
    scheduleProposal,
    sessionSlotsPreview.length > 0,
  );

  const tabValue = paymentMonthsToScheduleTab(
    viewingMonth ?? scheduleTabToPaymentMonths(scheduleMonthTabs[0]?.value ?? "m1"),
  );

  const handleTabChange = (v: string) => {
    onViewingMonthChange?.(scheduleTabToPaymentMonths(v));
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <Clock className="h-3.5 w-3.5 shrink-0 text-[#3954d0]/80" aria-hidden />
            Class schedule
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            Live sessions the school planned (admin proposal, instructor approved when applicable). Use the month tabs
            below to browse
            {linkPaymentMonths
              ? "; they line up with the payment months you check above."
              : " by schedule month."}
          </p>
          {statusHint ? <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{statusHint}</p> : null}
        </div>
      </div>

      {sessionSlotsPreview.length > 0 && scheduleMonthTabs.length > 0 ? (
        <Tabs
          value={tabValue}
          onValueChange={onViewingMonthChange ? handleTabChange : undefined}
          className="mt-3"
        >
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-none border-0 bg-transparent p-0 text-zinc-600">
            {scheduleMonthTabs.map((t) => {
              const monthNum = scheduleTabToPaymentMonths(t.value);
              const isPaying = selectedPaymentMonths?.has(monthNum) ?? false;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className={cn(
                    "flex min-h-[2.75rem] flex-col gap-0.5 whitespace-normal rounded-xl border border-zinc-200/90 bg-zinc-100/80 px-2 py-1.5 text-center text-xs shadow-none transition-colors",
                    "data-[state=active]:border-[#3954d0]/35 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm",
                    isPaying && "ring-1 ring-[#3954d0]/25",
                  )}
                >
                  <span className="flex items-center justify-center gap-1 font-semibold leading-tight text-zinc-800">
                    {isPaying ? (
                      <span
                        className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#3954d0]"
                        aria-hidden
                      />
                    ) : null}
                    {t.tabLabel}
                  </span>
                  {t.monthLine ? (
                    <span className="text-[10px] font-normal leading-snug text-zinc-500">{t.monthLine}</span>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {scheduleMonthTabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-3 focus-visible:outline-none">
              {t.slots.length > 0 ? (
                <ul className="space-y-2">
                  {t.slots.map((row, idx) => {
                    const dateLabel = formatClassDateLabel(row.sessionDate) ?? "Date TBA";
                    const timeLabel = formatSessionTimeLabel(row.sessionTime);
                    const offset = monthSessionOffsets[t.value as "m1" | "m2" | "m3"] ?? 0;
                    const meetingNum = offset + idx + 1;
                    const customTitle = row.title?.trim();
                    const dateIsTba = dateLabel === "Date TBA";
                    const timingStatus = resolveEnrollmentSessionTimingStatus(
                      row,
                      effectiveHeldSlotKeys,
                      effectiveActiveSlotKeys,
                    );
                    return (
                      <li
                        key={`${t.value}-${row.sessionDate}-${idx}-${meetingNum}`}
                        className={cn(
                          "rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-100/80",
                          timingStatus === "finished" && "opacity-60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {customTitle ? (
                              <p className="text-sm font-semibold tracking-tight text-zinc-900">
                                {formatDisplayTitle(customTitle)}
                              </p>
                            ) : (
                              <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-600 ring-1 ring-zinc-200/90">
                                Meeting {meetingNum}
                              </span>
                            )}
                          </div>
                          <SessionTimingChip status={timingStatus} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                              dateIsTba
                                ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                                : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200/90",
                            )}
                          >
                            <CalendarDays
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                dateIsTba ? "text-amber-600/90" : "text-[#3954d0]/75",
                              )}
                              aria-hidden
                            />
                            {dateLabel}
                          </span>
                          {timeLabel ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium tabular-nums text-zinc-700 ring-1 ring-zinc-200/90">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-[#3954d0]/75" aria-hidden />
                              {timeLabel}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No sessions listed for this month.</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Session dates are not published yet. You can still apply; the school will confirm when class meets.
        </p>
      )}
    </div>
  );
}
