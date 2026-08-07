import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { eduhubAdmin } from "@/api/eduhubClient";
import type { TeacherResponse } from "@/api/eduhubTypes";
import { Input } from "@/components/ui/input";
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
import {
  CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS,
  DEFAULT_INSTRUCTOR_REVENUE_SHARE,
  formatContractShareLabel,
  isContractRevenueShareOverride,
  normalizeInstructorEmail,
  setInstructorRevenueShareOverride,
  useInstructorRevenueShareOverrides,
  type ContractInstructorRevenueShare,
} from "@/features/payroll/instructorRevenueShareStorage";

function shareSelectValue(email: string, overrides: Record<string, ContractInstructorRevenueShare>): string {
  const key = normalizeInstructorEmail(email);
  return String(overrides[key] ?? DEFAULT_INSTRUCTOR_REVENUE_SHARE);
}

export function AdminPayrollContractRatesPanel() {
  const { t } = useTranslation();
  const overrides = useInstructorRevenueShareOverrides();
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    eduhubAdmin
      .listTeachers()
      .then((res) => {
        if (!cancelled) setTeachers(Array.isArray(res) ? res : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : t("admin.payroll.rates.loadFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (!q) return sorted;
    return sorted.filter((teacher) =>
      [teacher.fullName, teacher.email, teacher.category ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [search, teachers]);

  const handleShareChange = (email: string, raw: string) => {
    const parsed = Number(raw);
    if (!CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS.includes(parsed as ContractInstructorRevenueShare)) {
      return;
    }
    setInstructorRevenueShareOverride(
      email,
      parsed === DEFAULT_INSTRUCTOR_REVENUE_SHARE ? "default" : (parsed as ContractInstructorRevenueShare),
    );
    toast.success(t("admin.payroll.rates.saved"));
  };

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-slate-600">{t("admin.payroll.rates.description")}</p>
      <p className="text-xs text-slate-500">
        {t("admin.payroll.rates.defaultNote", {
          split: formatContractShareLabel(DEFAULT_INSTRUCTOR_REVENUE_SHARE),
        })}
      </p>

      <div className="max-w-md">
        <Input
          placeholder={t("admin.payroll.rates.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>{t("admin.shared.instructor")}</TableHead>
              <TableHead>{t("admin.shared.email")}</TableHead>
              <TableHead className="w-[10rem]">{t("admin.payroll.rates.contractSplit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-sm text-slate-500">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-sm text-slate-500">
                  {teachers.length === 0
                    ? t("admin.payroll.rates.emptyNoTeachers")
                    : t("admin.payroll.rates.emptyNoMatch")}
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => {
                const customized = isContractRevenueShareOverride(teacher.email);
                return (
                  <TableRow key={teacher.id}>
                    <TableCell className="text-sm font-medium text-slate-900">{teacher.fullName}</TableCell>
                    <TableCell className="text-xs text-slate-600">{teacher.email}</TableCell>
                    <TableCell>
                      <Select
                        value={shareSelectValue(teacher.email, overrides)}
                        onValueChange={(value) => handleShareChange(teacher.email, value)}
                      >
                        <SelectTrigger className="h-9 w-[9.5rem] bg-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_INSTRUCTOR_REVENUE_SHARE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {formatContractShareLabel(option)}
                              {option === DEFAULT_INSTRUCTOR_REVENUE_SHARE
                                ? ` (${t("admin.payroll.rates.default")})`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!customized ? (
                        <p className="mt-1 text-[10px] text-slate-500">{t("admin.payroll.rates.usingDefault")}</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
