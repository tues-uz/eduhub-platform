import { describe, expect, it } from "vitest";
import {
  scheduleMonthRemainingSessionCounts,
  type SessionSlotLike,
} from "@/features/courses/classSchedulePreview";
import { tuitionForJoinFromMeeting } from "@/features/enrollment/enrollmentSessionTuition";
import { payNowForSelectedCalendarMonths } from "@/features/enrollment/enrollmentTuitionThirds";

const EMPTY = new Set<string>();

/** 9 sessions, 3 per calendar month (Jan / Feb / Mar 2026), all at noon. */
function nineSessionsAcrossThreeMonths(): SessionSlotLike[] {
  const days = [5, 15, 25];
  const months = ["01", "02", "03"];
  const slots: SessionSlotLike[] = [];
  for (const m of months) {
    for (const d of days) {
      slots.push({
        title: `Session ${m}-${d}`,
        sessionDate: `2026-${m}-${String(d).padStart(2, "0")}`,
        sessionTime: "12:00",
        durationMinutes: 90,
      });
    }
  }
  return slots;
}

// Rifki's scenario: 300k class, 9 classes over 3 months (3/month). Once the first class
// is finished, the price must be split per remaining class — not per whole month.
describe("enrollment tuition proration — finished classes", () => {
  const slots = nineSessionsAcrossThreeMonths();
  const LISTED = 300_000;

  it("counts only remaining (non-finished) sessions per month", () => {
    // Now = Jan 10 2026: the Jan 5 session is finished; everything else upcoming.
    const now = new Date("2026-01-10T00:00:00").getTime();
    const counts = scheduleMonthRemainingSessionCounts(slots, EMPTY, EMPTY, now);
    expect(counts).toEqual([2, 3, 3]);
  });

  it("charges the partially-finished month for its remaining classes only", () => {
    const now = new Date("2026-01-10T00:00:00").getTime();
    const remainingCounts = scheduleMonthRemainingSessionCounts(slots, EMPTY, EMPTY, now);

    // Session-level proration: full price minus the one finished class (join from meeting 2).
    const quote = tuitionForJoinFromMeeting(LISTED, 9, 2);
    expect(quote).not.toBeNull();
    const tuitionDueTotal = quote!.amountDue; // 300000 - 33334 = 266666

    const monthOne = payNowForSelectedCalendarMonths(
      tuitionDueTotal,
      new Set([1]),
      remainingCounts,
    );
    expect(monthOne).not.toBeNull();

    // Month 1 now has 2 remaining classes ≈ 2 × 33,333 = 66,666 — NOT a naive equal third
    // of the remaining total (~88,889), which would over-charge the started month.
    expect(monthOne!.payNow).toBe(66_666);
    const naiveEqualThird = Math.round(tuitionDueTotal / 3);
    expect(monthOne!.payNow).toBeLessThan(naiveEqualThird);
  });

  it("still sums to the full remaining total when every month is selected", () => {
    const now = new Date("2026-01-10T00:00:00").getTime();
    const remainingCounts = scheduleMonthRemainingSessionCounts(slots, EMPTY, EMPTY, now);
    const tuitionDueTotal = tuitionForJoinFromMeeting(LISTED, 9, 2)!.amountDue;

    const all = payNowForSelectedCalendarMonths(
      tuitionDueTotal,
      new Set([1, 2, 3]),
      remainingCounts,
    );
    expect(all!.payNow).toBe(tuitionDueTotal);
    expect(all!.parts).toEqual([66_666, 100_000, 100_000]);
  });

  it("excludes a fully-finished month from tuition weights", () => {
    // Now = Feb 10: all of January is finished, plus February's Feb 5 session.
    const now = new Date("2026-02-10T00:00:00").getTime();
    const counts = scheduleMonthRemainingSessionCounts(slots, EMPTY, EMPTY, now);
    expect(counts).toEqual([0, 2, 3]);
  });
});
