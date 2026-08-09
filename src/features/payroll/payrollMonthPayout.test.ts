import { describe, expect, it } from "vitest";
import type { SessionSlotLike } from "@/features/courses/classSchedulePreview";
import {
  computePayrollMonthRequestedPayout,
  inferListedTuitionPerStudent,
  resolveSchedulePlanMonthForYearMonth,
} from "./payrollMonthPayout";

function sampleNineSessions(): SessionSlotLike[] {
  const months = ["01", "02", "03"];
  const days = ["05", "15", "25"];
  const slots: SessionSlotLike[] = [];
  for (const m of months) {
    for (const d of days) {
      slots.push({
        title: `Session ${m}-${d}`,
        sessionDate: `2026-${m}-${d}`,
        sessionTime: "10:00",
        durationMinutes: 90,
      });
    }
  }
  return slots;
}

describe("payrollMonthPayout", () => {
  const slots = sampleNineSessions();

  it("resolves schedule plan month correctly", () => {
    const planJan = resolveSchedulePlanMonthForYearMonth(slots, "2026-01");
    expect(planJan).not.toBeNull();
    expect(planJan?.planMonth).toBe(1);

    const planFeb = resolveSchedulePlanMonthForYearMonth(slots, "2026-02");
    expect(planFeb).not.toBeNull();
    expect(planFeb?.planMonth).toBe(2);
  });

  it("infers listed tuition per student from payment averages", () => {
    const tuition = inferListedTuitionPerStudent(slots, [100000, 100000]);
    expect(tuition).toBe(300000);
  });

  it("computes requested payroll quote without reference error", () => {
    const quote = computePayrollMonthRequestedPayout({
      listedTuitionPerStudent: 300000,
      currency: "IDR",
      slots,
      schedulePeriodKey: "2026-01",
      paidStudentCount: 5,
      instructorEmail: "teacher@test.com",
    });

    expect(quote).not.toBeNull();
    expect(quote?.amount).toBeGreaterThan(0);
    expect(quote?.formatted).toBeDefined();
    expect(quote?.breakdown).toBeDefined();
    expect(quote?.planMonth).toBe(1);
    expect(quote?.paidStudentCount).toBe(5);
  });
});
