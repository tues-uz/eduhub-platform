import { useMemo } from "react";
import { ClipboardList } from "@/lib/icons";
import {
  endReasonLabel,
  formatDurationMs,
  type StoredAttendanceMeeting,
} from "@/features/teacher/attendance/attendanceMeetingsStorage";

function formatShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function durationMsFor(meeting: StoredAttendanceMeeting): number | null {
  if (!meeting.endedAt) return null;
  const start = new Date(meeting.createdAt).getTime();
  const end = new Date(meeting.endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, end - start);
}

type Props = {
  meetings: StoredAttendanceMeeting[];
  title?: string;
  description?: string;
};

/** Session history, straight from the backend attendance sessions for this course — no local log. */
export function AttendanceSessionLogsSection({
  meetings,
  title = "Attendance QR session log",
  description = "Each QR generation starts a session; duration is recorded when the session ends (new QR, 2h 15m cap, or manual stop).",
}: Props) {
  const sorted = useMemo(
    () => [...meetings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [meetings],
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
                <th className="px-3 py-2.5">Meeting</th>
                <th className="px-3 py-2.5">Modality</th>
                <th className="px-3 py-2.5">How it ended</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const duration = durationMsFor(row);
                return (
                  <tr key={row.sessionId} className="border-b border-slate-50 last:border-0">
                    <td className="px-3 py-2.5 text-slate-800 tabular-nums">{formatShort(row.createdAt)}</td>
                    <td className="px-3 py-2.5 text-slate-700 tabular-nums">
                      {row.endedAt ? formatShort(row.endedAt) : "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {duration != null ? formatDurationMs(duration) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{row.name.trim() || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {row.modality === "online" ? "Online" : "In person"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {row.status === "CLOSED" ? endReasonLabel(row.endReason ?? "") : "In progress"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
