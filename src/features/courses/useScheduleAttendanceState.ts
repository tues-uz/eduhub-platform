import { useQuery } from "@tanstack/react-query";
import { refreshScheduleAttendanceState } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";

const REFRESH_INTERVAL_MS = 30_000;

/** Live held/active schedule slot keys for a course, derived from real attendance QR sessions
 * (never cached in localStorage) — a row is "held" once its QR session is CLOSED (instructor
 * stopped it or the check-in window elapsed) and "active" while its QR session is OPEN. */
export function useScheduleAttendanceState(courseId: string | undefined) {
  const query = useQuery({
    queryKey: ["schedule-attendance-state", courseId],
    queryFn: () => refreshScheduleAttendanceState(courseId as string),
    enabled: Boolean(courseId),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });

  return {
    heldSlotKeys: query.data?.heldSlotKeys ?? new Set<string>(),
    activeSlotKeys: query.data?.activeSlotKeys ?? new Set<string>(),
  };
}
