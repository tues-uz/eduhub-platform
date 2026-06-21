import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminCertifications } from "@/features/admin/data/adminOperationalMock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminCertificationsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [eligibleFilter, setEligibleFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  const courseOptions = useMemo(() => {
    const names = new Set(mockAdminCertifications.map((c) => c.course));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminCertifications.filter((c) => {
      if (eligibleFilter === "yes" && !c.eligible) return false;
      if (eligibleFilter === "no" && c.eligible) return false;
      if (courseFilter !== "all" && c.course !== courseFilter) return false;
      if (!q) return true;
      return [c.studentName, c.course].join(" ").toLowerCase().includes(q);
    });
  }, [search, eligibleFilter, courseFilter]);

  const hasActiveFilters =
    search.trim() !== "" || eligibleFilter !== "all" || courseFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          {t("admin.shared.backToDashboard")}
        </Link>

        <AdminPageHeader
          title={t("adminNav.certifications")}
          description={t("admin.certifications.description")}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.shared.searchStudentClass")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={eligibleFilter} onValueChange={setEligibleFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder={t("admin.certifications.eligibilityPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allEligibility")}</SelectItem>
              <SelectItem value="yes">{t("admin.certifications.eligible")}</SelectItem>
              <SelectItem value="no">{t("admin.certifications.notEligible")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allClasses")}</SelectItem>
              {courseOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-600"
              onClick={() => {
                setSearch("");
                setEligibleFilter("all");
                setCourseFilter("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>{t("admin.shared.student")}</TableHead>
                <TableHead>{t("admin.shared.class")}</TableHead>
                <TableHead>{t("admin.certifications.table.survey")}</TableHead>
                <TableHead>{t("admin.certifications.table.classComplete")}</TableHead>
                <TableHead>{t("admin.certifications.eligible")}</TableHead>
                <TableHead className="text-right">{t("admin.certifications.table.issue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No rows match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-slate-900">{c.studentName}</TableCell>
                    <TableCell>{c.course}</TableCell>
                    <TableCell>{c.surveyComplete ? t("admin.shared.done") : t("admin.shared.missing")}</TableCell>
                    <TableCell>{c.courseComplete ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {c.eligible ? (
                        <Badge className="bg-emerald-600">{t("admin.certifications.eligible")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.certifications.notEligible")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!c.eligible}
                        title={!c.eligible ? t("admin.certifications.issueDisabledTitle") : undefined}
                        onClick={() => toast.success(t("admin.certifications.toast.issuedDemo"), { description: `${c.studentName} — ${c.course}` })}
                      >
                        Issue certificate
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
