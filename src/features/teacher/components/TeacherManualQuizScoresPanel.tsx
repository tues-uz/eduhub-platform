import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Trash2 } from "@/lib/icons";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";
import { cn } from "@/lib/utils";
import type { ClassMeetingSlot } from "@/features/teacher/types";
import { formatClassMeetingSlotLabel } from "@/features/teacher/pages/teacherCourseFormHelpers";
import { eduhubQuizGrading } from "@/api/eduhubClient";
import type { QuizColumnResponse } from "@/api/eduhubTypes";
import { parseManualQuizScoreInput, sumManualQuizInputs } from "@/features/teacher/data/manualQuizScoresStorage";

type ManualQuizColumn = QuizColumnResponse;

export type ManualQuizRosterStudent = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
};

type TeacherManualQuizScoresPanelProps = {
  courseId: string;
  students: ManualQuizRosterStudent[];
  /** Approved class schedule sessions (admin proposal + instructor approval). */
  scheduleSlots?: ClassMeetingSlot[];
  isApiCourse: boolean;
  isLoading?: boolean;
  isError?: boolean;
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

/** Draft scores: studentId → quizColumnId → raw input string */
type DraftMap = Record<string, Record<string, string>>;

function buildDraftFromScores(
  columns: ManualQuizColumn[],
  scores: Record<string, Record<string, number>>,
  students: ManualQuizRosterStudent[],
): DraftMap {
  const draft: DraftMap = {};
  for (const s of students) {
    const row: Record<string, string> = {};
    for (const col of columns) {
      const score = scores[s.id]?.[col.id];
      row[col.id] = score != null ? String(score) : "";
    }
    draft[s.id] = row;
  }
  return draft;
}

function shortQuizLabel(col: ManualQuizColumn, index: number): string {
  const trimmed = col.title.trim();
  const base = !trimmed
    ? `#${index + 1}`
    : trimmed.length <= 14
      ? `#${index + 1} · ${trimmed}`
      : `#${index + 1} · ${trimmed.slice(0, 12)}…`;
  return base;
}

function computeRowTotal(
  row: Record<string, string> | undefined,
  cols: ManualQuizColumn[],
): number | null {
  return sumManualQuizInputs(row, cols);
}

function formatRowTotal(total: number | null): string {
  if (total == null) return "—";
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

const QUIZ_ACTIONS_COL_CLASS =
  "sticky right-0 z-20 w-[4.5rem] min-w-[4.5rem] border-b border-l border-border bg-background px-2 py-1.5 text-center align-middle whitespace-nowrap shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted";
const QUIZ_ACTIONS_HEAD_CLASS =
  "sticky right-0 z-30 w-[4.5rem] min-w-[4.5rem] border-b border-l border-border bg-muted px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)]";
const QUIZ_TOTAL_COL_CLASS =
  "sticky right-[4.5rem] z-20 w-14 min-w-14 border-b border-l border-border bg-background px-2 py-2 text-center align-middle tabular-nums text-sm font-semibold text-foreground group-hover:bg-muted";
const QUIZ_TOTAL_HEAD_CLASS =
  "sticky right-[4.5rem] z-30 w-14 min-w-14 border-b border-l border-border bg-muted px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)]";

function StudentIdentityCell({ student }: { student: ManualQuizRosterStudent }) {
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

export function TeacherManualQuizScoresPanel({
  courseId,
  students,
  scheduleSlots = [],
  isApiCourse,
  isLoading = false,
  isError = false,
}: TeacherManualQuizScoresPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<DraftMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);

  const scheduleRows = useMemo(
    () =>
      scheduleSlots.map((slot, index) => ({
        key: `slot-${index}`,
        index,
        slot,
        label: formatClassMeetingSlotLabel(slot, index),
        date: slot.sessionDate?.trim() || "",
      })),
    [scheduleSlots],
  );

  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(scheduleRows.map((r) => r.date).filter(Boolean)),
    ).sort();
    return dates;
  }, [scheduleRows]);

  const sessionsForDate = useMemo(() => {
    if (!selectedDate) return scheduleRows;
    return scheduleRows.filter((r) => r.date === selectedDate);
  }, [scheduleRows, selectedDate]);

  const resetAddDialog = useCallback(() => {
    setNewTitle("");
    setSelectedDate("");
    setSelectedSessionKey("");
  }, []);

  const openAddDialog = useCallback(() => {
    resetAddDialog();
    setAddOpen(true);
  }, [resetAddDialog]);

  const columnsQuery = useQuery({
    queryKey: ["teacher", "quiz-columns", courseId],
    queryFn: () => eduhubQuizGrading.listColumns(courseId),
    enabled: isApiCourse,
  });
  const scoresQuery = useQuery({
    queryKey: ["teacher", "quiz-scores", courseId],
    queryFn: () => eduhubQuizGrading.getScores(courseId),
    enabled: isApiCourse,
  });

  const columns: ManualQuizColumn[] = useMemo(() => columnsQuery.data ?? [], [columnsQuery.data]);
  const scores = useMemo(() => scoresQuery.data ?? {}, [scoresQuery.data]);

  useEffect(() => {
    setDraft(buildDraftFromScores(columns, scores, students));
  }, [columns, scores, students]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["teacher", "quiz-columns", courseId] });
    void queryClient.invalidateQueries({ queryKey: ["teacher", "quiz-scores", courseId] });
  }, [queryClient, courseId]);

  const addColumnMutation = useMutation({
    mutationFn: (body: Parameters<typeof eduhubQuizGrading.addColumn>[1]) =>
      eduhubQuizGrading.addColumn(courseId, body),
    onSuccess: invalidate,
  });
  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) => eduhubQuizGrading.deleteColumn(courseId, columnId),
    onSuccess: invalidate,
  });
  const saveScoresMutation = useMutation({
    mutationFn: ({ studentId, scores: s }: { studentId: string; scores: Record<string, number | null> }) =>
      eduhubQuizGrading.saveStudentScores(courseId, studentId, s),
    onSuccess: invalidate,
  });

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

  const updateCell = useCallback((studentId: string, columnId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [columnId]: value,
      },
    }));
  }, []);

  const buildScoresForStudent = useCallback(
    (studentId: string): Record<string, number | null> | null => {
      const row = draft[studentId] ?? {};
      const scores: Record<string, number | null> = {};
      for (const col of columns) {
        const raw = row[col.id] ?? "";
        if (!raw.trim()) {
          scores[col.id] = null;
          continue;
        }
        const parsed = parseManualQuizScoreInput(raw);
        if (parsed == null) {
          toast.error(t("teacher.roster.quizScores.toast.invalidScore"));
          return null;
        }
        scores[col.id] = parsed;
      }
      return scores;
    },
    [columns, draft, t],
  );

  const handleSaveRow = async (studentId: string) => {
    const scores = buildScoresForStudent(studentId);
    if (!scores) return;
    setSavingId(studentId);
    try {
      await saveScoresMutation.mutateAsync({ studentId, scores });
      toast.success(t("teacher.roster.quizScores.toast.saved"));
    } catch {
      toast.error(t("teacher.roster.quizScores.toast.invalidScore"));
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      for (const s of filteredStudents) {
        const scores = buildScoresForStudent(s.id);
        if (!scores) return;
        await saveScoresMutation.mutateAsync({ studentId: s.id, scores });
      }
      toast.success(t("teacher.roster.quizScores.toast.savedAll"));
    } catch {
      toast.error(t("teacher.roster.quizScores.toast.invalidScore"));
    } finally {
      setSavingAll(false);
    }
  };

  const handleAddColumn = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error(t("teacher.roster.quizScores.toast.titleRequired"));
      return;
    }
    if (scheduleRows.length > 0 && !selectedSessionKey) {
      toast.error(t("teacher.roster.quizScores.addDialog.sessionRequired"));
      return;
    }
    const session = scheduleRows.find((r) => r.key === selectedSessionKey);
    try {
      await addColumnMutation.mutateAsync({
        title,
        sessionSlotKey: session?.key,
        sessionLabel: session?.label,
        sessionDate: session?.date || selectedDate || undefined,
      });
      resetAddDialog();
      setAddOpen(false);
      toast.success(t("teacher.roster.quizScores.toast.columnAdded"));
    } catch {
      toast.error(t("teacher.roster.quizScores.toast.invalidScore"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteColumnId) return;
    try {
      await deleteColumnMutation.mutateAsync(deleteColumnId);
      setDeleteColumnId(null);
      toast.success(t("teacher.roster.quizScores.toast.columnDeleted"));
    } catch {
      toast.error(t("teacher.roster.quizScores.toast.invalidScore"));
    }
  };

  if (!isApiCourse) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("teacher.roster.quizScores.empty.connectApi")}
      </div>
    );
  }
  if (isLoading || columnsQuery.isLoading || scoresQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">{t("teacher.roster.quizScores.empty.loading")}</p>;
  }
  if (isError || columnsQuery.isError || scoresQuery.isError) {
    return <p className="text-sm text-red-600">{t("teacher.roster.quizScores.empty.error")}</p>;
  }
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        {t("teacher.roster.quizScores.empty.noStudents")}
      </div>
    );
  }

  const deleteColumn = columns.find((c) => c.id === deleteColumnId);
  const quizColSpan = Math.max(columns.length, 1);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {t("teacher.roster.quizScores.title")}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("teacher.roster.quizScores.intro")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {columns.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={savingAll}
              onClick={() => void handleSaveAll()}
            >
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("teacher.roster.quizScores.saveAll")}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-teal-700 hover:bg-teal-800"
            onClick={openAddDialog}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("teacher.roster.quizScores.addQuiz")}
          </Button>
        </div>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("teacher.roster.quizScores.searchPlaceholder")}
          className="h-9 bg-background pl-9"
          aria-label={t("teacher.roster.quizScores.searchPlaceholder")}
        />
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-center gap-2 border-b border-border bg-muted px-3 py-2">
          <span
            className="inline-flex size-4 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30"
            aria-hidden
          >
            <span className="size-1.5 rounded-full bg-amber-500" />
          </span>
          <span className="text-xs font-semibold text-foreground">
            {t("teacher.roster.quizScores.groupLabel")}
          </span>
        </div>
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="sticky left-0 z-30 w-10 min-w-10 border-b border-r border-border bg-muted px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("teacher.roster.quizScores.table.no")}
                </th>
                <th className="sticky left-10 z-30 w-52 min-w-52 max-w-52 border-b border-r border-border bg-muted px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]">
                  {t("teacher.roster.quizScores.table.student")}
                </th>
                {columns.length === 0 ? (
                  <th className="border-b border-r border-border px-4 py-3 text-left text-xs font-normal italic text-muted-foreground">
                    {t("teacher.roster.quizScores.noQuizzesShared")}
                  </th>
                ) : (
                  columns.map((col, index) => (
                    <th
                      key={col.id}
                      className="min-w-[7rem] max-w-[7.5rem] border-b border-r border-border px-1.5 py-1.5 text-center"
                      title={[col.title, col.sessionLabel].filter(Boolean).join(" · ")}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex w-full items-center justify-center gap-1">
                          <span className="truncate text-[11px] font-medium text-foreground">
                            {shortQuizLabel(col, index)}
                          </span>
                          <button
                            type="button"
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600"
                            title={t("teacher.roster.quizScores.deleteQuiz")}
                            aria-label={t("teacher.roster.quizScores.deleteQuiz")}
                            onClick={() => setDeleteColumnId(col.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {col.sessionDate ? (
                          <span className="truncate text-[10px] font-normal text-muted-foreground">
                            {formatSessionDateLabel(col.sessionDate)}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  ))
                )}
                <th className={QUIZ_TOTAL_HEAD_CLASS}>
                  {t("teacher.roster.quizScores.table.total")}
                </th>
                <th className={QUIZ_ACTIONS_HEAD_CLASS}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={quizColSpan + 4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("teacher.roster.quizScores.empty.noSearchResults")}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, index) => (
                  <tr key={s.id} className="group hover:bg-muted/20">
                    <td className="sticky left-0 z-20 w-10 min-w-10 border-b border-r border-border bg-background px-2 py-2 text-center text-xs tabular-nums text-muted-foreground group-hover:bg-muted">
                      {index + 1}
                    </td>
                    <td className="sticky left-10 z-20 w-52 min-w-52 max-w-52 border-b border-r border-border bg-background px-3 py-2 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] group-hover:bg-muted">
                      <StudentIdentityCell student={s} />
                    </td>
                    {columns.length === 0 ? (
                      <td className="border-b border-r border-border px-4 py-2 text-xs italic text-muted-foreground/70">
                        —
                      </td>
                    ) : (
                      columns.map((col) => {
                        const value = draft[s.id]?.[col.id] ?? "";
                        const empty = !value.trim();
                        const isZero = value.trim() === "0";
                        return (
                          <td
                            key={col.id}
                            className="min-w-[7rem] max-w-[7.5rem] border-b border-r border-border p-0 text-center align-middle"
                          >
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              inputMode="decimal"
                              placeholder={t("teacher.roster.quizScores.ungraded")}
                              value={value}
                              onChange={(e) => updateCell(s.id, col.id, e.target.value)}
                              className={cn(
                                "h-10 w-full border-0 bg-transparent px-1 text-center text-sm tabular-nums outline-none placeholder:text-[11px] placeholder:italic placeholder:text-muted-foreground/70 focus:bg-teal-50/50 focus:ring-1 focus:ring-inset focus:ring-teal-600/30",
                                isZero && "font-medium text-red-600",
                                empty && "text-muted-foreground",
                              )}
                              aria-label={`${col.title} — ${formatDisplayPersonName(s.fullName)}`}
                            />
                          </td>
                        );
                      })
                    )}
                    <td className={QUIZ_TOTAL_COL_CLASS}>
                      {formatRowTotal(computeRowTotal(draft[s.id], columns))}
                    </td>
                    <td className={QUIZ_ACTIONS_COL_CLASS}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={savingId === s.id || columns.length === 0}
                        onClick={() => void handleSaveRow(s.id)}
                      >
                        {savingId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          t("teacher.roster.quizScores.save")
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("teacher.roster.quizScores.empty.noColumnsDescription")}
        </p>
      ) : null}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetAddDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("teacher.roster.quizScores.addDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("teacher.roster.quizScores.addDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {scheduleRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                {t("teacher.roster.quizScores.addDialog.noSchedule")}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t("teacher.roster.quizScores.addDialog.dateLabel")}</Label>
                  <Select
                    value={selectedDate || undefined}
                    onValueChange={(date) => {
                      setSelectedDate(date);
                      setSelectedSessionKey((prev) => {
                        const stillValid = scheduleRows.some(
                          (r) => r.key === prev && r.date === date,
                        );
                        return stillValid ? prev : "";
                      });
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue
                        placeholder={t("teacher.roster.quizScores.addDialog.datePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {formatSessionDateLabel(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("teacher.roster.quizScores.addDialog.sessionLabel")}</Label>
                  <Select
                    value={selectedSessionKey || undefined}
                    onValueChange={(key) => {
                      setSelectedSessionKey(key);
                      const row = scheduleRows.find((r) => r.key === key);
                      if (row?.date) setSelectedDate(row.date);
                    }}
                    disabled={Boolean(selectedDate) && sessionsForDate.length === 0}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue
                        placeholder={t("teacher.roster.quizScores.addDialog.sessionPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedDate ? sessionsForDate : scheduleRows).map((row) => (
                        <SelectItem key={row.key} value={row.key}>
                          #{row.index + 1}. {row.slot.title?.trim() || row.label}
                          {row.slot.sessionTime?.trim()
                            ? ` · ${row.slot.sessionTime.trim()}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDate && sessionsForDate.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t("teacher.roster.quizScores.addDialog.noSessionsForDate")}
                    </p>
                  ) : null}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="manual-quiz-title">
                {t("teacher.roster.quizScores.addDialog.label")}
              </Label>
              <Input
                id="manual-quiz-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("teacher.roster.quizScores.addDialog.placeholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddColumn();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="bg-teal-700 hover:bg-teal-800"
              onClick={() => void handleAddColumn()}
            >
              {t("teacher.roster.quizScores.addQuiz")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteColumnId)}
        onOpenChange={(open) => {
          if (!open) setDeleteColumnId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("teacher.roster.quizScores.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacher.roster.quizScores.deleteDialog.description", {
                title: deleteColumn?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleConfirmDelete()}
            >
              {t("teacher.roster.quizScores.deleteQuiz")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
