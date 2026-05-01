import { useCallback, useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ATTENDANCE_MEETINGS_CHANGED,
  formatMeetingOptionLabel,
  loadStoredMeetings,
  meetingsStorageKey,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import {
  ATTENDANCE_ROLL_BROADCAST,
  ATTENDANCE_ROLL_CHANGED,
  ATTENDANCE_ROLL_STORAGE_KEY,
  countPresentForSession,
} from "@/features/attendance/attendanceRollStorage";
import { cn } from "@/lib/utils";

type Props = {
  courseId: string;
  className?: string;
  /** Fires when the selected meeting changes, including the first load from storage. */
  onSelectionChange?: (sessionId: string | null) => void;
};

export function AttendanceOverviewQrPicker({ courseId, className, onSelectionChange }: Props) {
  const [meetings, setMeetings] = useState<StoredAttendanceMeeting[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  /** Re-render when local roll updates so “present” counts in the list stay fresh. */
  const [rollTick, setRollTick] = useState(0);
  /** Previous meetings list head — used to detect “Generate QR” prepending a new session. */
  const prevListHeadRef = useRef<string | null>(null);

  useEffect(() => {
    prevListHeadRef.current = null;
  }, [courseId]);

  const refresh = useCallback(() => {
    const list = loadStoredMeetings(courseId);
    const newHead = list[0]?.sessionId ?? null;
    const prevHead = prevListHeadRef.current;
    prevListHeadRef.current = newHead;

    setMeetings(list);
    setSelectedSessionId((prevSelected) => {
      const firstEverMeetings = prevHead === null && newHead !== null;
      const newQrPrepended = newHead !== null && prevHead !== null && newHead !== prevHead;
      if (firstEverMeetings || newQrPrepended) {
        return newHead;
      }
      if (prevSelected && list.some((m) => m.sessionId === prevSelected)) {
        return prevSelected;
      }
      return newHead;
    });
  }, [courseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = (e: Event) => {
      const ce = e as CustomEvent<{ courseId?: string }>;
      if (ce.detail?.courseId === courseId) refresh();
    };
    const bumpRoll = () => setRollTick((t) => t + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === meetingsStorageKey(courseId)) refresh();
      if (e.key === ATTENDANCE_ROLL_STORAGE_KEY) bumpRoll();
    };
    window.addEventListener(ATTENDANCE_MEETINGS_CHANGED, onChanged);
    window.addEventListener(ATTENDANCE_ROLL_CHANGED, bumpRoll);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ATTENDANCE_MEETINGS_CHANGED, onChanged);
      window.removeEventListener(ATTENDANCE_ROLL_CHANGED, bumpRoll);
      window.removeEventListener("storage", onStorage);
    };
  }, [courseId, refresh]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bumpRoll = () => setRollTick((t) => t + 1);
    const bc = new BroadcastChannel(ATTENDANCE_ROLL_BROADCAST);
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; courseId?: string } | undefined;
      if (d?.type === "check-in" && d.courseId === courseId) bumpRoll();
    };
    return () => bc.close();
  }, [courseId]);

  useEffect(() => {
    onSelectionChange?.(selectedSessionId);
  }, [selectedSessionId, onSelectionChange]);

  if (!courseId) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-2",
        className,
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="attendance-overview-pick-meeting">Meeting (for the table below)</Label>
        <Select
          value={selectedSessionId ?? undefined}
          onValueChange={(v) => setSelectedSessionId(v)}
          disabled={meetings.length === 0}
        >
          <SelectTrigger id="attendance-overview-pick-meeting" className="max-w-xl bg-white">
            <SelectValue
              placeholder={meetings.length === 0 ? "No meetings generated yet" : "Choose a meeting"}
            />
          </SelectTrigger>
          <SelectContent>
            {meetings.map((m) => {
              void rollTick;
              const present = countPresentForSession(courseId, m.sessionId);
              const suffix =
                present > 0 ? ` · ${present} checked in (this browser)` : " · no check-ins stored here yet";
              return (
                <SelectItem key={m.sessionId} value={m.sessionId}>
                  {`${formatMeetingOptionLabel(m)}${suffix}`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground max-w-xl">
          After you tap Generate above, this menu switches to that new meeting so the table matches the QR you show.
          Older meetings stay in the list if you need yesterday&apos;s data (counts are per session, this browser only).
        </p>
      </div>

      {meetings.length === 0 ? (
        <p className="text-sm text-foreground/60 pt-1">
          Generate a meeting in &quot;Class meeting check-in&quot; above first — it will show up in this list.
        </p>
      ) : null}
    </div>
  );
}
