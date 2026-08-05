import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Users } from "@/lib/icons";
import { eduhubLecturer } from "@/api/eduhubClient";
import { useAuthSession } from "@/features/auth/context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDisplayPersonName, profileInitials } from "@/lib/formatPersonName";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  course: string;
  enrolledDate: string;
};

function StudentIdentityCell({ student }: { student: StudentRow }) {
  const displayName = formatDisplayPersonName(student.name);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0 border border-border">
        {student.avatarUrl ? <AvatarImage src={student.avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-teal-50 text-xs font-semibold text-teal-800">
          {profileInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold uppercase tracking-wide text-foreground leading-tight">
          {displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{student.email}</p>
      </div>
    </div>
  );
}

const TeacherStudentsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthSession();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      if (!user.id) return;
      setLoading(true);
      try {
        const studentsData = await eduhubLecturer.getAllStudents(user.id);
        setStudents(
          (studentsData || []).map((s) => ({
            id: `${s.id}-${s.courseTitle}-${s.enrolledAt}`,
            name: s.fullName,
            email: s.email,
            avatarUrl: s.avatarUrl?.trim() || undefined,
            course: s.courseTitle,
            enrolledDate: s.enrolledAt?.split("T")[0] || new Date().toISOString().split("T")[0],
          })),
        );
      } catch {
        setStudents([]);
      }
      setLoading(false);
    }
    load();
  }, [user.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q),
    );
  }, [students, search]);

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6 md:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("teacher.students.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("teacher.students.subtitle")}</p>
          </div>
          {!loading && students.length > 0 ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {t("teacher.students.count", { count: students.length })}
            </div>
          ) : null}
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("teacher.students.searchPlaceholder")}
            className="h-10 bg-background pl-9"
            aria-label={t("teacher.students.searchPlaceholder")}
            disabled={loading || students.length === 0}
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 whitespace-nowrap text-center text-muted-foreground">
                      #
                    </TableHead>
                    <TableHead className="min-w-[16rem]">
                      {t("teacher.students.table.student")}
                    </TableHead>
                    <TableHead>{t("teacher.students.table.class")}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">
                      {t("teacher.students.table.enrolledDate")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                        {students.length === 0
                          ? t("teacher.students.empty")
                          : t("teacher.students.noSearchResults")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center tabular-nums text-sm text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <StudentIdentityCell student={row} />
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{row.course}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                          {row.enrolledDate}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
