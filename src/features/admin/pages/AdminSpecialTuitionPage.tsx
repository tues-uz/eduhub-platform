import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "@/lib/icons";
import { toast } from "sonner";
import { eduhubCourses } from "@/api/eduhubClient";
import type { CourseSummaryResponse } from "@/api/eduhubTypes";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import {
  deleteSpecialTuitionGrant,
  setSpecialTuitionGrantActive,
  upsertSpecialTuitionGrant,
} from "@/features/admin/data/specialTuitionGrantsStore";
import { useSpecialTuitionGrants } from "@/features/admin/hooks/useSpecialTuitionGrants";
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

export default function AdminSpecialTuitionPage() {
  const grants = useSpecialTuitionGrants();
  const [emailInput, setEmailInput] = useState("");
  const [courseScope, setCourseScope] = useState<string>("all");
  const [noteInput, setNoteInput] = useState("");

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

  const handleAddGrant = () => {
    try {
      const courseId = courseScope === "all" ? null : courseScope;
      upsertSpecialTuitionGrant({
        email: emailInput,
        courseId,
        courseTitle: courseId ? courseTitleById.get(courseId) : undefined,
        note: noteInput,
      });
      toast.success("Special tuition grant saved", {
        description: courseId
          ? `${emailInput.trim()} can enroll in this class for free.`
          : `${emailInput.trim()} can enroll in any class for free.`,
      });
      setEmailInput("");
      setNoteInput("");
      setCourseScope("all");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save grant.");
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-4xl px-6 pb-10">
        <Link
          to="/dashboard/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Special tuition grants"
          description="Grant free enrollment to specific student emails—for example staff family or scholarship cases. Stored in this browser until a grants API exists."
        />

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Add grant</h2>
          <p className="mt-1 text-xs text-slate-500">
            The student must sign in with this email when applying. Tuition shows as free on their enrollment form.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="grant-email">Student email</Label>
              <Input
                id="grant-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="student@example.com"
                className="bg-white"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant-class">Class scope</Label>
              <Select value={courseScope} onValueChange={setCourseScope} disabled={coursesLoading}>
                <SelectTrigger id="grant-class" className="bg-white">
                  <SelectValue placeholder="Choose class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grant-note">Note (optional)</Label>
              <Input
                id="grant-note"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Rector family"
                className="bg-white"
              />
            </div>
          </div>

          <Button
            type="button"
            className="mt-5 bg-slate-900 hover:bg-slate-800"
            onClick={handleAddGrant}
            disabled={!emailInput.trim()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save grant
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Email</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Added</TableHead>
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
                    <TableCell className="font-mono text-xs text-slate-900">{grant.email}</TableCell>
                    <TableCell className="max-w-[220px] text-slate-800">
                      {grant.courseId
                        ? grant.courseTitle ?? courseTitleById.get(grant.courseId) ?? grant.courseId
                        : "All classes"}
                    </TableCell>
                    <TableCell className="text-slate-600">{grant.note || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={grant.active}
                        onCheckedChange={(checked) => {
                          setSpecialTuitionGrantActive(grant.id, checked);
                          toast.success(checked ? "Grant enabled" : "Grant paused");
                        }}
                        aria-label={`Toggle grant for ${grant.email}`}
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
                        onClick={() => {
                          deleteSpecialTuitionGrant(grant.id);
                          toast.success("Grant removed");
                        }}
                        aria-label={`Remove grant for ${grant.email}`}
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
    </AdminLayout>
  );
}
