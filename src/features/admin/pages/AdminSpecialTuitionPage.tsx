import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "@/lib/icons";
import { toast } from "sonner";
import { eduhubAdminTuitionGrants, eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { useTranslation } from "react-i18next";
import { AdminActionCodeField, useAdminActionCodeState } from "@/features/admin/components/AdminActionCodeField";
import { validateAdminActionCodeOrThrow } from "@/features/admin/adminStaffCode";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function fetchAdminCourses(): Promise<CourseSummaryResponse[]> {
  const [main, drafts] = await Promise.all([
    eduhubCourses.getAll({ page: 0, size: 100 }),
    eduhubCourses.getAll({ page: 0, size: 100, status: "DRAFT" }).catch(() => [] as CourseSummaryResponse[]),
  ]);
  const byId = new Map<string, CourseSummaryResponse>();
  for (const c of [...main, ...drafts]) {
    byId.set(c.id, c);
  }
  return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function formatGrantDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const GRANTS_QUERY_KEY = ["admin", "tuition-grants"] as const;

export default function AdminSpecialTuitionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [adminActionCode, setAdminActionCode] = useAdminActionCodeState();
  const [emailInput, setEmailInput] = useState("");
  const [courseScope, setCourseScope] = useState<string>("all");
  const [noteInput, setNoteInput] = useState("");

  const { data: grants = [] } = useQuery({
    queryKey: GRANTS_QUERY_KEY,
    queryFn: eduhubAdminTuitionGrants.list,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["admin", "courses", "list"],
    queryFn: fetchAdminCourses,
  });

  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of courses) {
      map.set(course.id, course.title);
    }
    return map;
  }, [courses]);

  const upsertMutation = useMutation({
    mutationFn: eduhubAdminTuitionGrants.upsert,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GRANTS_QUERY_KEY });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (opts: { email: string; courseId: string | null; active: boolean; code: string }) =>
      eduhubAdminTuitionGrants.upsert({
        email: opts.email,
        courseId: opts.courseId,
        active: opts.active,
        adminActionCode: opts.code,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GRANTS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (opts: { id: string; code: string }) => eduhubAdminTuitionGrants.remove(opts.id, opts.code),
    onSuccess: () => {
      toast.success(t("admin.specialTuition.toast.removed"));
      void queryClient.invalidateQueries({ queryKey: GRANTS_QUERY_KEY });
    },
  });

  const handleAddGrant = () => {
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code.");
      return;
    }
    const courseId = courseScope === "all" ? null : courseScope;
    upsertMutation.mutate(
      {
        email: emailInput,
        courseId,
        note: noteInput,
        active: true,
        adminActionCode: code,
      },
      {
        onSuccess: () => {
          toast.success(t("admin.specialTuition.toast.saved"), {
            description: courseId
              ? `${emailInput.trim()} can enroll in this class for free.`
              : `${emailInput.trim()} can enroll in any class for free.`,
          });
          setEmailInput("");
          setNoteInput("");
          setCourseScope("all");
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "Could not save grant.");
        },
      },
    );
  };

  const handleToggle = (grant: (typeof grants)[number], checked: boolean) => {
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code.");
      return;
    }
    toggleActiveMutation.mutate(
      { email: grant.studentEmail, courseId: grant.courseId ?? null, active: checked, code },
      {
        onSuccess: () => toast.success(checked ? t("admin.specialTuition.toast.enabled") : "Grant paused"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update grant."),
      },
    );
  };

  const handleDelete = (grantId: string) => {
    let code: string;
    try {
      code = validateAdminActionCodeOrThrow(adminActionCode);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enter your admin code.");
      return;
    }
    deleteMutation.mutate({ id: grantId, code });
  };

  return (
      <div className="container mx-auto max-w-4xl px-6 pb-10">

        <AdminPageHeader
          title={t("adminNav.specialTuition")}
          description={t("admin.specialTuition.description")}
        />

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">{t("admin.specialTuition.addGrant")}</h2>
          <p className="mt-1 text-xs text-slate-500">
            The student must sign in with this email when applying. Tuition shows as free on their enrollment form.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="grant-email">{t("admin.specialTuition.studentEmail")}</Label>
              <Input
                id="grant-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t("admin.specialTuition.emailPlaceholder")}
                className="bg-white"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant-class">{t("admin.specialTuition.classScope")}</Label>
              <Select value={courseScope} onValueChange={setCourseScope} disabled={coursesLoading}>
                <SelectTrigger id="grant-class" className="bg-white">
                  <SelectValue placeholder={t("admin.specialTuition.chooseClass")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.shared.allClasses")}</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant-note">{t("admin.payments.markPaidDialog.noteOptional")}</Label>
              <Input
                id="grant-note"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={t("admin.specialTuition.notePlaceholder")}
                className="bg-white"
              />
            </div>

            <AdminActionCodeField id="grant-action-code" value={adminActionCode} onChange={setAdminActionCode} />
          </div>

          <Button
            type="button"
            className="mt-5 bg-slate-900 hover:bg-slate-800"
            onClick={handleAddGrant}
            disabled={!emailInput.trim() || upsertMutation.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save grant
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>{t("admin.shared.email")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.specialTuition.table.note")}</TableHead>
                <TableHead>{t("admin.shared.active")}</TableHead>
                <TableHead>{t("admin.specialTuition.table.added")}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No grants yet. Add a student email above.
                  </TableCell>
                </TableRow>
              ) : (
                grants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell className="font-mono text-xs text-slate-900">{grant.studentEmail}</TableCell>
                    <TableCell className="max-w-[220px] text-slate-800">
                      {grant.courseId
                        ? grant.courseTitle ?? courseTitleById.get(grant.courseId) ?? grant.courseId
                        : t("admin.shared.backToAllClasses")}
                    </TableCell>
                    <TableCell className="text-slate-600">{grant.note || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={grant.active}
                        onCheckedChange={(checked) => handleToggle(grant, checked)}
                        aria-label={`Toggle grant for ${grant.studentEmail}`}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {formatGrantDate(grant.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                        onClick={() => handleDelete(grant.id)}
                        aria-label={`Remove grant for ${grant.studentEmail}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}
