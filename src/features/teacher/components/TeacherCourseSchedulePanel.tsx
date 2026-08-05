import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Pencil,
  QrCode,
  User,
  UserPlus,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ClassMeetingSlot } from "@/features/teacher/types";
import type { SubstituteInviteResponse } from "@/api/eduhubTypes";
import {
  getScheduleAttendanceState,
  HELD_SCHEDULE_MEETINGS_CHANGED,
  refreshScheduleAttendanceState,
  scheduleSlotKeyFromParts,
} from "@/features/teacher/attendance/heldScheduleMeetingsStorage";
import { cn } from "@/lib/utils";

export type SchedulePanelRow = {
  index: number;
  slot: ClassMeetingSlot;
};

type Props = {
  courseId: string;
  rows: SchedulePanelRow[];
  instructorName: string;
  getSubstituteInvite?: (index: number) => SubstituteInviteResponse | undefined;
  editScheduleHref?: string;
  onInviteSubstitute?: () => void;
  /** Switch to attendance tab for this class. */
  onOpenAttendance?: () => void;
  isSubstituteViewer?: boolean;
};

function formatSessionDate(iso?: string): string {
  const raw = iso?.trim();
  if (!raw) return "—";
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSessionTime(time?: string): string {
  const raw = time?.trim();
  if (!raw) return "—";
  const [h, m] = raw.split(":").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return raw;
  const d = new Date(1970, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function substituteCoverLabel(status: SubstituteInviteResponse["status"]): string {
  switch (status) {
    case "APPROVED":
      return "Cover approved";
    case "PENDING_ADMIN_APPROVAL":
      return "Cover · admin";
    case "PENDING_PRIMARY_APPROVAL":
      return "Cover · instructor";
    case "PENDING_SUBSTITUTE_RESPONSE":
      return "Cover · pending";
    default:
      return "Substitute";
  }
}

const UNDATED_MONTH_KEY = "undated";

function monthKeyFromSlot(slot: ClassMeetingSlot): string {
  const raw = slot.sessionDate?.trim();
  if (!raw) return UNDATED_MONTH_KEY;
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return UNDATED_MONTH_KEY;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string, undatedLabel: string): string {
  if (monthKey === UNDATED_MONTH_KEY) return undatedLabel;
  const [year, month] = monthKey.split("-").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return undatedLabel;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function groupRowsByMonth(rows: SchedulePanelRow[]): { key: string; rows: SchedulePanelRow[] }[] {
  const map = new Map<string, SchedulePanelRow[]>();
  for (const row of rows) {
    const key = monthKeyFromSlot(row.slot);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === UNDATED_MONTH_KEY) return 1;
      if (b === UNDATED_MONTH_KEY) return -1;
      return a.localeCompare(b);
    })
    .map(([key, monthRows]) => ({ key, rows: monthRows }));
}

export function TeacherCourseSchedulePanel({
  courseId,
  rows,
  instructorName,
  getSubstituteInvite,
  editScheduleHref,
  onInviteSubstitute,
  onOpenAttendance,
  isSubstituteViewer = false,
}: Props) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(() => rows[0]?.index ?? 0);
  const [attendanceTick, setAttendanceTick] = useState(0);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  const monthGroups = useMemo(() => groupRowsByMonth(rows), [rows]);

  useEffect(() => {
    if (!rows.length) return;
    if (!rows.some((r) => r.index === selectedIndex)) {
      setSelectedIndex(rows[0].index);
    }
  }, [rows, selectedIndex]);

  useEffect(() => {
    const selectedRow = rows.find((r) => r.index === selectedIndex) ?? rows[0];
    if (!selectedRow) return;
    const key = monthKeyFromSlot(selectedRow.slot);
    setOpenMonths((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, [rows, selectedIndex]);

  useEffect(() => {
    if (!courseId) return;
    void refreshScheduleAttendanceState(courseId).then(() => setAttendanceTick((n) => n + 1));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ courseId?: string }>).detail;
      if (detail?.courseId === courseId) setAttendanceTick((n) => n + 1);
    };
    window.addEventListener(HELD_SCHEDULE_MEETINGS_CHANGED, onChange);
    return () => window.removeEventListener(HELD_SCHEDULE_MEETINGS_CHANGED, onChange);
  }, [courseId]);

  const attendanceState = useMemo(() => {
    void attendanceTick;
    return getScheduleAttendanceState(courseId);
  }, [attendanceTick, courseId]);

  const selected = rows.find((r) => r.index === selectedIndex) ?? rows[0];
  const selectedInvite = selected ? getSubstituteInvite?.(selected.index) : undefined;

  if (!rows.length || !selected) return null;

  const selectedKey = scheduleSlotKeyFromParts({
    sessionDate: selected.slot.sessionDate,
    sessionTime: selected.slot.sessionTime,
    title: selected.slot.title,
  });
  const selectedHeld = attendanceState.heldSlotKeys.has(selectedKey);
  const selectedActive = attendanceState.activeSlotKeys.has(selectedKey);
  const selectedTitle =
    selected.slot.title?.trim() ||
    t("teacher.roster.sessionFallback", { n: selected.index + 1 });

  const renderSessionButton = ({ index, slot }: SchedulePanelRow) => {
    const title = slot.title?.trim() || t("teacher.roster.sessionFallback", { n: index + 1 });
    const key = scheduleSlotKeyFromParts({
      sessionDate: slot.sessionDate,
      sessionTime: slot.sessionTime,
      title: slot.title,
    });
    const held = attendanceState.heldSlotKeys.has(key);
    const active = attendanceState.activeSlotKeys.has(key);
    const isSelected = index === selected.index;
    const invite = getSubstituteInvite?.(index);

    return (
      <button
        type="button"
        onClick={() => setSelectedIndex(index)}
        className={cn(
          "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
          isSelected ? "bg-teal-50 text-teal-950" : "text-foreground hover:bg-muted/60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              #{index + 1}. {title}
            </p>
            {held ? (
              <span className="inline-flex shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-emerald-800">
                {t("teacher.roster.schedule.statusHeld")}
              </span>
            ) : active ? (
              <span className="inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-900">
                {t("teacher.roster.schedule.statusLive")}
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                  isSelected
                    ? "border-teal-200 bg-teal-100/80 text-teal-900"
                    : "border-border bg-muted/50 text-muted-foreground",
                )}
              >
                {t("teacher.roster.schedule.statusPlanned")}
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-0.5 truncate text-xs",
              isSelected ? "text-teal-900/70" : "text-muted-foreground",
            )}
          >
            {formatSessionDate(slot.sessionDate)}
            {slot.sessionTime?.trim() ? ` · ${formatSessionTime(slot.sessionTime)}` : ""}
            {invite ? ` · ${t("teacher.roster.schedule.coverChip")}` : ""}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
      <aside className="border-b border-border lg:border-b-0 lg:border-r">
        <div className="flex min-h-[3.8125rem] items-center border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {t("teacher.roster.schedule.sessionCount", { count: rows.length })}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {t("teacher.roster.schedule.sidebarHint")}
            </p>
          </div>
        </div>
        <div className="max-h-[22rem] space-y-1 overflow-y-auto p-2 lg:max-h-[32rem]">
          {monthGroups.map((group) => {
            const open = openMonths[group.key] ?? false;
            return (
              <Collapsible
                key={group.key}
                open={open}
                onOpenChange={(next) =>
                  setOpenMonths((prev) => ({ ...prev, [group.key]: next }))
                }
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/50">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {formatMonthLabel(group.key, t("teacher.roster.schedule.undatedMonth"))}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {group.rows.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        open ? "rotate-180" : "",
                      )}
                    />
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pt-1">
                  {group.rows.map((row) => (
                    <div key={row.index}>{renderSessionButton(row)}</div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-[22rem] flex-col">
        <div className="flex min-h-[3.8125rem] flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t("teacher.roster.schedule.sessionLabel", { n: selected.index + 1 })}
            </span>
            {selectedHeld ? (
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                {t("teacher.roster.schedule.statusHeld")}
              </span>
            ) : selectedActive ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                {t("teacher.roster.schedule.statusLive")}
              </span>
            ) : (
              <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {t("teacher.roster.schedule.statusPlanned")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isSubstituteViewer && editScheduleHref ? (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={editScheduleHref}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("teacher.roster.schedule.editClassScheduleLink")}
                </Link>
              </Button>
            ) : null}
            {onOpenAttendance ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-teal-700 hover:bg-teal-800"
                onClick={onOpenAttendance}
              >
                <QrCode className="h-3.5 w-3.5" />
                {t("teacher.roster.schedule.takeAttendance")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-5 px-4 py-5 sm:px-5">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground">{selectedTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("teacher.roster.schedule.sessionDetailHint")}
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {t("teacher.roster.schedule.table.date")}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {formatSessionDate(selected.slot.sessionDate)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {t("teacher.roster.schedule.table.time")}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {formatSessionTime(selected.slot.sessionTime)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <User className="h-3.5 w-3.5" aria-hidden />
                {t("teacher.roster.meta.instructor")}
              </dt>
              <dd className="mt-1 truncate text-sm font-medium text-foreground" title={instructorName}>
                {instructorName}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <UserPlus className="h-3.5 w-3.5" aria-hidden />
                {t("teacher.roster.schedule.table.substituteInstructor")}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {selectedInvite ? (
                  <div className="space-y-1">
                    <p className="truncate" title={selectedInvite.substituteEmail}>
                      {selectedInvite.substituteEmail}
                    </p>
                    <span className="inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {substituteCoverLabel(selectedInvite.status)}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </dl>

          {!isSubstituteViewer && onInviteSubstitute && !selectedInvite ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                {t("teacher.roster.schedule.inviteForSessionTitle")}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("teacher.roster.schedule.inviteForSessionBody")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 gap-1.5"
                onClick={onInviteSubstitute}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("teacher.roster.inviteSubstitute")}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
