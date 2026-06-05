import { adminEnrollmentPaidMonthsStore } from "@/features/admin/data/adminEnrollmentPaidMonthsStore";
import {
  buildScheduleMonthTabs,
  orderSessionSlotsChronologically,
  scheduleTabToPaymentMonths,
  type ScheduleMonthTab,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { formatClassMeetingSlotLabel } from "@/features/courses/courseScheduleSlots";
import { scheduleSlotKeyFromParts } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import type { EnrollmentApplicationResponse } from "@/api/eduhubTypes";
import {
  paidTuitionMonthsFromPaymentFields,
  type EnrollmentPaymentFields,
  type TuitionPlanMonths,
} from "@/features/enrollment/enrollmentTuitionThirds";

export function scheduleMonthCountFromSlots(slots: SessionSlotLike[]): number {
  if (!slots.length) return 0;
  return buildScheduleMonthTabs(orderSessionSlotsChronologically(slots)).length;
}

export function resolvePaidTuitionMonths(
  enrollment: EnrollmentApplicationResponse | EnrollmentPaymentFields | null | undefined,
  scheduleSlots: SessionSlotLike[],
  applicationId?: string,
): Set<TuitionPlanMonths> | null {
  if (applicationId) {
    const override = adminEnrollmentPaidMonthsStore.get(applicationId);
    if (override) return new Set(override);
  }
  if (!enrollment) return null;
  const monthCount = scheduleMonthCountFromSlots(scheduleSlots);
  return paidTuitionMonthsFromPaymentFields(enrollment, monthCount || undefined);
}

export function paymentMonthForScheduleSlotKey(
  slots: SessionSlotLike[],
  slotKey: string,
): TuitionPlanMonths | null {
  const key = slotKey.trim();
  if (!key || key === "||") return null;
  const ordered = orderSessionSlotsChronologically(slots);
  const tabs = buildScheduleMonthTabs(ordered);
  for (const tab of tabs) {
    for (const slot of tab.slots) {
      if (scheduleSlotKeyFromParts(slot) === key) {
        return scheduleTabToPaymentMonths(tab.value);
      }
    }
  }
  return null;
}

export function paymentMonthForMeetingName(
  slots: SessionSlotLike[],
  meetingName: string,
): TuitionPlanMonths | null {
  const norm = meetingName.trim().toLowerCase();
  if (!norm) return null;
  const ordered = orderSessionSlotsChronologically(slots);
  const tabs = buildScheduleMonthTabs(ordered);
  for (let i = 0; i < ordered.length; i++) {
    const slot = ordered[i]!;
    const label = formatClassMeetingSlotLabel(slot, i).trim().toLowerCase();
    const title = slot.title?.trim().toLowerCase() ?? "";
    if (label !== norm && title !== norm && !label.includes(norm) && !norm.includes(label)) {
      continue;
    }
    let offset = 0;
    for (const tab of tabs) {
      if (i < offset + tab.slots.length) {
        return scheduleTabToPaymentMonths(tab.value);
      }
      offset += tab.slots.length;
    }
  }
  return null;
}

export function paymentMonthForSlotIndex(
  slots: SessionSlotLike[],
  index: number,
): TuitionPlanMonths | null {
  const ordered = orderSessionSlotsChronologically(slots);
  if (index < 0 || index >= ordered.length) return null;
  return paymentMonthForScheduleSlotKey(ordered, scheduleSlotKeyFromParts(ordered[index]!));
}

export function isAttendanceMonthPaid(
  paidMonths: ReadonlySet<TuitionPlanMonths> | null | undefined,
  paymentMonth: TuitionPlanMonths | null,
): boolean {
  if (!paymentMonth) return true;
  if (!paidMonths) return true;
  return paidMonths.has(paymentMonth);
}

export function scheduleMonthLabel(
  paymentMonth: TuitionPlanMonths,
  scheduleTabs: ScheduleMonthTab[],
): string {
  const tab = scheduleTabs.find((t) => scheduleTabToPaymentMonths(t.value) === paymentMonth);
  if (tab?.monthLine && tab.monthLine !== "Dates to be confirmed" && tab.monthLine !== "No dates yet") {
    return tab.monthLine;
  }
  return tab?.tabLabel ?? `month ${paymentMonth}`;
}

export function attendanceTuitionBlockMessage(
  paymentMonth: TuitionPlanMonths,
  scheduleTabs: ScheduleMonthTab[],
): string {
  const label = scheduleMonthLabel(paymentMonth, scheduleTabs);
  return `Tuition for ${label} has not been paid yet. Pay this schedule month before scanning the attendance QR.`;
}

export function paidMonthsSummary(
  paidMonths: ReadonlySet<TuitionPlanMonths>,
  scheduleTabs: ScheduleMonthTab[],
): string {
  if (paidMonths.size >= scheduleTabs.length) return "All schedule months paid";
  const labels = scheduleTabs
    .filter((t) => paidMonths.has(scheduleTabToPaymentMonths(t.value)))
    .map((t) => t.monthLine || t.tabLabel);
  return labels.length ? `Paid: ${labels.join(", ")}` : "No months marked paid";
}
