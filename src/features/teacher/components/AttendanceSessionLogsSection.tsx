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
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No attendance sessions logged yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Ended</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
                <th className="px-4 py-2.5 font-medium">Meeting</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Ended by</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const duration = durationMsFor(row);
                return (
                  <tr key={row.sessionId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-foreground">{formatShort(row.createdAt)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.endedAt ? formatShort(row.endedAt) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {duration != null ? formatDurationMs(duration) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{row.name.trim() || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.modality === "online" ? "Online" : "In person"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
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
