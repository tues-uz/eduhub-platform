import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Search } from "@/lib/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { eduhubAttendance } from "@/api/eduhubClient";
import { isUuid } from "@/api/utils";
import {
  formatMeetingOptionLabel,
  pickStoredMeetingForScheduleSlot,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";
import { scheduleSlotKeyFromParts } from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import type { useTeacherClassChecklist } from "@/features/teacher/hooks/useTeacherClassChecklist";
import { formatClassMeetingSlotLabel } from "@/features/teacher/pages/teacherCourseFormHelpers";
import type { ClassMeetingSlot } from "@/features/teacher/types";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";

export type AttendanceMatrixStudent = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
};

type TeacherChecklist = ReturnType<typeof useTeacherClassChecklist>;

type ScheduleSlotRow = {
  index: number;
  slot: ClassMeetingSlot;
};

type TeacherAttendanceMatrixPanelProps = {
  courseId: string;
  students: AttendanceMatrixStudent[];
  /** Approved class schedule rows (preserve original slot index for QR mapping). */
  scheduleSlotRows?: ScheduleSlotRow[];
  /** Fallback when rows are not passed. */
  scheduleSlots?: ClassMeetingSlot[];
  attendanceMeetings: StoredAttendanceMeeting[];
  /** Bumps when local roll / meetings refresh in the parent shell. */
  attendanceUiKey: number;
  teacherChecklist: TeacherChecklist;
  isApiCourse: boolean;
  isLoading?: boolean;
  isError?: boolean;
};

type CellEntry = {
  present: boolean;
  checkedAt?: string;
};

function formatSessionDateLabel(iso?: string): string {
  const raw = iso?.trim();
  if (!raw) return "";
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortSessionLabel(slot: ClassMeetingSlot, index: number): string {
  const trimmed = slot.title?.trim();
  if (!trimmed) return `#${index + 1}`;
  return trimmed.length <= 14 ? `#${index + 1} · ${trimmed}` : `#${index + 1} · ${trimmed.slice(0, 12)}…`;
}

function findMeetingsForSlot(
  meetings: StoredAttendanceMeeting[],
  index: number,
  slot: ClassMeetingSlot,
  label: string,
): StoredAttendanceMeeting[] {
  const slotKey = scheduleSlotKeyFromParts(slot);
  const matched = new Map<string, StoredAttendanceMeeting>();

  for (const meeting of meetings) {
    const sessionId = meeting.sessionId?.trim();
    if (!sessionId) continue;

    const matches =
      meeting.scheduleSlotKey?.trim() === slotKey ||
      meeting.scheduleSlotIndex === index ||
      Boolean(pickStoredMeetingForScheduleSlot([meeting], label, slot.sessionDate?.trim()));

    if (matches) {
      matched.set(sessionId, meeting);
    }
  }

  return [...matched.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function findMeetingForSlot(
  meetings: StoredAttendanceMeeting[],
  index: number,
  slot: ClassMeetingSlot,
): StoredAttendanceMeeting | null {
  const label = formatClassMeetingSlotLabel(slot, index);
  const all = findMeetingsForSlot(meetings, index, slot, label);
  return all[0] ?? null;
}

function StudentIdentityCell({ student }: { student: AttendanceMatrixStudent }) {
  const displayName = formatDisplayPersonName(student.fullName);
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="h-8 w-8 shrink-0 border border-border">
        {student.avatarUrl ? <AvatarImage src={student.avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
          {profileInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold uppercase tracking-wide text-foreground leading-tight">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{student.email}</p>
      </div>
    </div>
  );
}

export function TeacherAttendanceMatrixPanel({
  courseId,
  students,
  scheduleSlotRows,
  scheduleSlots = [],
  attendanceMeetings,
  attendanceUiKey,
  teacherChecklist,
  isApiCourse,
  isLoading = false,
  isError = false,
}: TeacherAttendanceMatrixPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const scheduleRows = useMemo(() => {
    const rows: ScheduleSlotRow[] =
      scheduleSlotRows ??
      scheduleSlots.map((slot, index) => ({
        index,
        slot,
      }));
    return rows.map(({ slot, index }) => {
      const label = formatClassMeetingSlotLabel(slot, index);
      const meetingsForSlot = findMeetingsForSlot(attendanceMeetings, index, slot, label);
      return {
        key: `slot-${index}`,
        index,
        slot,
        label,
        meeting: meetingsForSlot[0] ?? null,
        meetingSessionIds: meetingsForSlot
          .map((m) => m.sessionId?.trim())
          .filter((id): id is string => Boolean(id && isUuid(id))),
      };
    });
  }, [attendanceMeetings, scheduleSlotRows, scheduleSlots]);

  const allSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const meeting of attendanceMeetings) {
      const id = meeting.sessionId?.trim();
      if (id && isUuid(id)) ids.add(id);
    }
    return [...ids];
  }, [attendanceMeetings]);

  const rosterQueries = useQueries({
    queries: allSessionIds.map((sessionId) => ({
      queryKey: ["teacher", "attendance-matrix-roster", courseId, sessionId, attendanceUiKey],
      queryFn: () => eduhubAttendance.roster(courseId, sessionId),
      enabled: Boolean(courseId && isUuid(courseId) && isUuid(sessionId)),
      staleTime: 5_000,
      refetchInterval: 8_000,
    })),
  });

  const rosterBySession = useMemo(() => {
    void attendanceUiKey;
    const map = new Map<string, Map<string, CellEntry>>();
    rosterQueries.forEach((query, idx) => {
      const sessionId = allSessionIds[idx];
      if (!sessionId || !query.data?.rows) return;
      const byStudent = new Map<string, CellEntry>();
      for (const row of query.data.rows) {
        const entry: CellEntry = {
          present: row.present,
          checkedAt: row.checkedAt,
        };
        byStudent.set(row.studentId, entry);
        byStudent.set(`email:${row.studentEmail.trim().toLowerCase()}`, entry);
      }
      map.set(sessionId, byStudent);
    });
    return map;
  }, [attendanceUiKey, rosterQueries, allSessionIds]);

  const resolveCell = useMemo(() => {
    return (student: AttendanceMatrixStudent, row: (typeof scheduleRows)[number]): CellEntry | null => {
      const sessionIdsForSlot = row.meetingSessionIds;
      if (sessionIdsForSlot.length === 0) return null;

      for (const sessionId of sessionIdsForSlot) {
        const apiEntry =
          rosterBySession.get(sessionId)?.get(student.id) ??
          rosterBySession.get(sessionId)?.get(`email:${student.email.trim().toLowerCase()}`);
        if (apiEntry?.present) return apiEntry;
      }

      return { present: false };
    };
  }, [rosterBySession]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

  if (!isApiCourse) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("teacher.roster.attendance.connectApi")}
      </div>
    );
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("teacher.roster.attendance.loadingRoster")}</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-600">{t("teacher.roster.attendance.loadStudentsError")}</p>;
  }
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("teacher.roster.attendance.noStudents")}
      </div>
    );
  }

  const colSpan = Math.max(scheduleRows.length, 1);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("teacher.roster.attendance.overviewTitle")}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("teacher.roster.attendance.matrixIntro")}
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("teacher.roster.attendance.matrixSearchPlaceholder")}
          className="h-9 bg-background pl-9"
          aria-label={t("teacher.roster.attendance.matrixSearchPlaceholder")}
        />
      </div>

      {scheduleRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          {t("teacher.roster.attendance.matrixNoSchedule")}
        </div>
      ) : (
        <div
          className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
          aria-label={t("teacher.roster.attendance.matrixTableAria")}
        >
          <div className="flex items-center justify-center gap-2 border-b border-border bg-muted px-3 py-2">
            <span
              className="inline-flex size-4 items-center justify-center rounded-full bg-teal-500/15 ring-1 ring-teal-500/30"
              aria-hidden
            >
              <span className="size-1.5 rounded-full bg-teal-600" />
            </span>
            <span className="text-xs font-semibold text-foreground">
              {t("teacher.roster.attendance.matrixGroupLabel")}
            </span>
          </div>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="sticky left-0 z-30 w-10 min-w-10 border-b border-r border-border bg-muted px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("teacher.roster.attendance.matrix.no")}
                  </th>
                  <th className="sticky left-10 z-30 w-52 min-w-52 max-w-52 border-b border-r border-border bg-muted px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]">
                    {t("teacher.roster.attendance.table.student")}
                  </th>
                  {scheduleRows.map((row) => (
                    <th
                      key={row.key}
                      className="min-w-[7rem] max-w-[7.5rem] border-b border-r border-border px-1.5 py-1.5 text-center"
                      title={[
                        row.label,
                        row.slot.sessionTime?.trim(),
                        row.meeting
                          ? formatMeetingOptionLabel(row.meeting)
                          : t("teacher.roster.attendance.matrixNoQrYet"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {shortSessionLabel(row.slot, row.index)}
                        </span>
                        {row.slot.sessionDate?.trim() ? (
                          <span className="truncate text-[10px] font-normal text-muted-foreground">
                            {formatSessionDateLabel(row.slot.sessionDate)}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colSpan + 2}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {t("teacher.roster.attendance.matrix.noSearchResults")}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => {
                    const displayName = formatDisplayPersonName(student.fullName);
                    return (
                      <tr key={student.id} className="group hover:bg-muted/20">
                        <td className="sticky left-0 z-20 w-10 min-w-10 border-b border-r border-border bg-background px-2 py-2 text-center text-xs tabular-nums text-muted-foreground group-hover:bg-muted">
                          {index + 1}
                        </td>
                        <td className="sticky left-10 z-20 w-52 min-w-52 max-w-52 border-b border-r border-border bg-background px-3 py-2 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted">
                          <StudentIdentityCell student={student} />
                        </td>
                        {scheduleRows.map((row) => {
                          const entry = resolveCell(student, row);
                          const qrPresent = Boolean(entry?.present);
                          const hasQrSession = row.meetingSessionIds.length > 0;
                          const manualItemId = `${teacherChecklist.verifyItemId}-${row.key}-${student.id}`;
                          const manualPresent =
                            teacherChecklist.ready && Boolean(teacherChecklist.checked[manualItemId]);
                          const isPresent = qrPresent || manualPresent;
                          const cellTitle = qrPresent
                            ? entry?.checkedAt
                              ? t("teacher.roster.attendance.matrix.checkedInAt", {
                                  time: new Date(entry.checkedAt).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }),
                                })
                              : t("teacher.roster.attendance.presentBadge")
                            : manualPresent
                              ? t("teacher.roster.attendance.matrix.manualPresent")
                              : hasQrSession
                                ? t("teacher.roster.attendance.absentBadge")
                                : t("teacher.roster.attendance.matrix.markPresentHint", {
                                    name: displayName,
                                    session: shortSessionLabel(row.slot, row.index),
                                  });

                          return (
                            <td
                              key={row.key}
                              className="min-h-[4.5rem] min-w-[7rem] max-w-[7.5rem] border-b border-r border-border px-1 py-2 text-center align-middle"
                              title={cellTitle}
                            >
                              <div className="flex min-h-[3.25rem] flex-col items-center justify-center gap-1.5 py-0.5">
                                <div className="flex min-h-[1.125rem] items-center justify-center">
                                  {qrPresent ? (
                                    <span className="inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[10px] font-medium text-emerald-700">
                                      <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
                                      {entry?.checkedAt
                                        ? new Date(entry.checkedAt).toLocaleTimeString(undefined, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : t("teacher.roster.attendance.presentBadge")}
                                    </span>
                                  ) : manualPresent ? (
                                    <span className="text-[10px] font-medium text-teal-700">
                                      {t("teacher.roster.attendance.matrix.manualBadge")}
                                    </span>
                                  ) : hasQrSession ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      {t("teacher.roster.attendance.absentBadge")}
                                    </span>
                                  ) : null}
                                </div>
                                {teacherChecklist.ready ? (
                                  <Checkbox
                                    id={`teacher-attendance-${manualItemId}`}
                                    checked={isPresent}
                                    disabled={qrPresent}
                                    onCheckedChange={(v) =>
                                      teacherChecklist.toggle(manualItemId, v === true)
                                    }
                                    className="shrink-0"
                                    aria-label={t("teacher.roster.attendance.matrix.markPresentAria", {
                                      name: displayName,
                                      session: shortSessionLabel(row.slot, row.index),
                                    })}
                                  />
                                ) : (
                                  <Checkbox
                                    disabled
                                    checked={qrPresent}
                                    className="shrink-0 opacity-40"
                                    aria-label={t("teacher.roster.attendance.signInToCheck")}
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("teacher.roster.attendance.matrixFootnote")}</p>
    </div>
  );
}
