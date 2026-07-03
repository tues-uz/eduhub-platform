import { useCallback, useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ATTENDANCE_MEETINGS_CHANGED,
  ATTENDANCE_OVERVIEW_SESSION_SYNC,
  formatMeetingOptionLabel,
  loadStoredMeetings,
  meetingsStorageKey,
  pickStoredMeetingForScheduleSlot,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import {
  ATTENDANCE_ROLL_BROADCAST,
  ATTENDANCE_ROLL_CHANGED,
  ATTENDANCE_ROLL_STORAGE_KEY,
  countPresentForSession,
} from "@/features/attendance/attendanceRollStorage";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type ApprovedScheduleSlotOption = {
  index: number;
  label: string;
  sessionDate?: string;
  sessionTime?: string;
  title?: string;
};

type Props = {
  courseId: string;
  className?: string;
  /** Fires when the selected meeting changes, including the first load from storage. */
  onSelectionChange?: (sessionId: string | null) => void;
  /**
   * When true, helper copy assumes this picker sits above the “Generate QR” controls
   * (same card as naming the meeting).
   */
  generateQrBelow?: boolean;
  /**
   * Planned class sessions from the schedule (admin workflow + instructor-approved dates).
   * Selecting one picks a saved QR when the meeting name or date matches; otherwise a toast explains next steps.
   */
  approvedScheduleSlots?: ApprovedScheduleSlotOption[];
  /**
   * When true, do not auto-select the newest saved QR on first load—wait for an explicit user choice.
   * Used with class roster so “Generate QR” can stay disabled until the instructor picks a row above.
   */
  deferAutoSelectFirstMeeting?: boolean;
  /**
   * Fires when the instructor picks a planned schedule row that does not yet match a saved QR.
   * Enables “Generate QR” using that row’s label as the meeting name. Pass null when a saved session is selected instead.
   */
  onScheduleSlotIntent?: (slot: ApprovedScheduleSlotOption | null) => void;
};

export function AttendanceOverviewQrPicker({
  courseId,
  className,
  onSelectionChange,
  generateQrBelow = false,
  approvedScheduleSlots,
  deferAutoSelectFirstMeeting = false,
  onScheduleSlotIntent,
}: Props) {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<StoredAttendanceMeeting[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  /** Radix value when user chose a plan row with no matching QR yet (`schedule-slot-${index}`). */
  const [pendingScheduleSelectValue, setPendingScheduleSelectValue] = useState<string | null>(null);
  /** Re-render when local roll updates so “present” counts in the list stay fresh. */
  const [rollTick, setRollTick] = useState(0);
  /** Previous meetings list head — used to detect “Generate QR” prepending a new session. */
  const prevListHeadRef = useRef<string | null>(null);

  const scheduleSlots = approvedScheduleSlots ?? [];
  const hasScheduleOptions = scheduleSlots.length > 0;
  const hasQrMeetings = meetings.length > 0;
  const selectEnabled = hasQrMeetings || hasScheduleOptions;

  const selectValue = (selectedSessionId ?? pendingScheduleSelectValue) || undefined;

  useEffect(() => {
    prevListHeadRef.current = null;
    setPendingScheduleSelectValue(null);
  }, [courseId]);

  const refresh = useCallback(() => {
    const list = loadStoredMeetings(courseId);
    const newHead = list[0]?.sessionId ?? null;
    const prevHead = prevListHeadRef.current;
    const newQrPrepended = newHead !== null && prevHead !== null && newHead !== prevHead;
    prevListHeadRef.current = newHead;

    setMeetings(list);

    if (deferAutoSelectFirstMeeting && newQrPrepended) {
      setPendingScheduleSelectValue(null);
      onScheduleSlotIntent?.(null);
    }

    setSelectedSessionId((prevSelected) => {
      if (deferAutoSelectFirstMeeting) {
        if (newQrPrepended) return newHead;
        if (prevSelected && list.some((m) => m.sessionId === prevSelected)) {
          return prevSelected;
        }
        return null;
      }

      const firstEverMeetings = prevHead === null && newHead !== null;
      if (firstEverMeetings || newQrPrepended) {
        return newHead;
      }
      if (prevSelected && list.some((m) => m.sessionId === prevSelected)) {
        return prevSelected;
      }
      return newHead;
    });
  }, [courseId, deferAutoSelectFirstMeeting, onScheduleSlotIntent]);

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
    const onSync = (e: Event) => {
      const ce = e as CustomEvent<{ courseId?: string; sessionId?: string }>;
      if (ce.detail?.courseId !== courseId || !ce.detail?.sessionId) return;
      const sid = ce.detail.sessionId;
      const list = loadStoredMeetings(courseId);
      setMeetings(list);
      if (list.some((m) => m.sessionId === sid)) {
        setPendingScheduleSelectValue(null);
        onScheduleSlotIntent?.(null);
        setSelectedSessionId(sid);
      }
    };
    window.addEventListener(ATTENDANCE_OVERVIEW_SESSION_SYNC, onSync);
    return () => window.removeEventListener(ATTENDANCE_OVERVIEW_SESSION_SYNC, onSync);
  }, [courseId, onScheduleSlotIntent]);

  useEffect(() => {
    onSelectionChange?.(selectedSessionId);
  }, [selectedSessionId, onSelectionChange]);

  const handleSelectValue = useCallback(
    (v: string) => {
      if (v.startsWith("schedule-slot-")) {
        const idx = Number.parseInt(v.slice("schedule-slot-".length), 10);
        const slot = scheduleSlots.find((s) => s.index === idx);
        if (!slot) return;
        const list = loadStoredMeetings(courseId);
        setMeetings(list);
        const picked = pickStoredMeetingForScheduleSlot(list, slot.label, slot.sessionDate);
        if (picked) {
          setPendingScheduleSelectValue(null);
          onScheduleSlotIntent?.(null);
          setSelectedSessionId(picked.sessionId);
        } else {
          setSelectedSessionId(null);
          setPendingScheduleSelectValue(v);
          onScheduleSlotIntent?.(slot);
        }
        return;
      }
      setPendingScheduleSelectValue(null);
      onScheduleSlotIntent?.(null);
      setSelectedSessionId(v);
    },
    [courseId, onScheduleSlotIntent, scheduleSlots],
  );

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
        <Select value={selectValue} onValueChange={handleSelectValue} disabled={!selectEnabled}>
          <SelectTrigger id="attendance-overview-pick-meeting" className="max-w-xl bg-white">
            <SelectValue
              placeholder={
                hasScheduleOptions && !hasQrMeetings
                  ? "Pick a planned session or saved meeting first"
                  : hasQrMeetings
                    ? "Choose a meeting"
                    : "No meetings generated yet"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {hasScheduleOptions ? (
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold text-muted-foreground">
                  Planned sessions (approved schedule)
                </SelectLabel>
                {scheduleSlots.map((s) => (
                  <SelectItem key={`sched-${s.index}`} value={`schedule-slot-${s.index}`}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            {hasQrMeetings ? (
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold text-muted-foreground">
                  Saved check-ins (this browser)
                </SelectLabel>
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
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground max-w-xl">
          {generateQrBelow ? (
            <>
              {hasScheduleOptions ? (
                <>
                  <span className="text-foreground/85">
                    Planned rows mirror the class schedule (admin proposal and dates you approved on the Schedule tab).
                  </span>{" "}
                </>
              ) : null}
              After you tap Generate below, this menu can switch to that new meeting so the roster table matches the QR
              you show. Older meetings stay in the list if you need yesterday&apos;s data (counts are per session, this
              browser only).
            </>
          ) : (
            <>
              After you tap Generate above, this menu switches to that new meeting so the table matches the QR you show.
              Older meetings stay in the list if you need yesterday&apos;s data (counts are per session, this browser
              only).
            </>
          )}
        </p>
      </div>

      {!hasQrMeetings ? (
        <p className="text-sm text-foreground/60 pt-1">
          {hasScheduleOptions
            ? "Pick a planned session (or a saved check-in when listed), then generate a QR below when you are ready."
            : generateQrBelow
              ? "Generate a meeting with the button below first — it will show up in this list."
              : 'Generate a meeting in "Class meeting check-in" above first — it will show up in this list.'}
        </p>
      ) : null}
    </div>
  );
}
