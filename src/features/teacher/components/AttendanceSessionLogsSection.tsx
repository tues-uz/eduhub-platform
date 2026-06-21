import { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "@/lib/icons";
import { useTranslation } from "react-i18next";
import {
  ATTENDANCE_SESSION_LOGS_CHANGED,
  endReasonLabel,
  formatDurationMs,
  type AttendanceSessionLogEntry,
} from "@/features/teacher/attendance/attendanceSessionLogsStorage";

function formatShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Props = {
  entries: AttendanceSessionLogEntry[];
  title?: string;
  description?: string;
  showInstructorColumn?: boolean;
};

export function AttendanceSessionLogsSection({
  entries,
  title = "Attendance QR session log",
  description = "Each QR generation starts a session; duration is recorded when the session ends (new QR, 2h 15m cap, or switching class). Stored in this browser.",
  showInstructorColumn = false,
}: Props) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [entries],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <ClipboardList className="h-5 w-5 text-slate-600" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
          No attendance sessions logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Started</th>
                <th className="px-3 py-2.5">Ended</th>
                <th className="px-3 py-2.5">Time in class</th>
                <th className="px-3 py-2.5">{t("teacher.dashboard.classesTable.header.class")}</th>
                <th className="px-3 py-2.5">Meeting</th>
                {showInstructorColumn ? <th className="px-3 py-2.5">Instructor</th> : null}
                <th className="px-3 py-2.5">How it ended</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2.5 text-slate-800 tabular-nums">{formatShort(row.startedAt)}</td>
                  <td className="px-3 py-2.5 text-slate-700 tabular-nums">
                    {row.endedAt ? formatShort(row.endedAt) : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    {row.durationMs != null ? formatDurationMs(row.durationMs) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-800">{row.courseTitle}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.meetingName.trim() || "—"}</td>
                  {showInstructorColumn ? (
                    <td className="px-3 py-2.5 text-slate-700">
                      {row.instructorName.trim() || row.instructorEmail.trim() || "—"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.endReason ? endReasonLabel(row.endReason) : "In progress"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Subscribe to log storage updates (same-tab). */
export function useAttendanceSessionLogsTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((x) => x + 1);
    window.addEventListener(ATTENDANCE_SESSION_LOGS_CHANGED, bump);
    return () => window.removeEventListener(ATTENDANCE_SESSION_LOGS_CHANGED, bump);
  }, []);
  return tick;
}
