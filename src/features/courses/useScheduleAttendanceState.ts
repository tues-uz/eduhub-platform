import { useEffect, useMemo, useState } from "react";
import {
  getScheduleAttendanceState,
  HELD_SCHEDULE_MEETINGS_CHANGED,
} from "@/features/teacher/attendance/heldScheduleMeetingsStorage";

/** Live held/active schedule slot keys for a course (attendance QR). */
export function useScheduleAttendanceState(courseId: string | undefined) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!courseId) return;
    const bump = () => setTick((t) => t + 1);
    const onHeld = (e: Event) => {
      const ce = e as CustomEvent<{ courseId?: string }>;
      if (!ce.detail?.courseId || ce.detail.courseId === courseId) bump();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes(courseId)) bump();
    };
    window.addEventListener(HELD_SCHEDULE_MEETINGS_CHANGED, onHeld);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HELD_SCHEDULE_MEETINGS_CHANGED, onHeld);
      window.removeEventListener("storage", onStorage);
    };
  }, [courseId]);

  return useMemo(() => {
    void tick;
    if (!courseId) {
      return { heldSlotKeys: new Set<string>(), activeSlotKeys: new Set<string>() };
    }
    return getScheduleAttendanceState(courseId);
  }, [courseId, tick]);
}
