import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminCertifications } from "@/features/admin/data/adminOperationalMock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function AdminCertificationsPage() {
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
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Certifications"
          description="Eligibility requires survey completion and class completion. Issue actions call the API when available."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder="Search student, class…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={eligibleFilter} onValueChange={setEligibleFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Eligibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All eligibility</SelectItem>
              <SelectItem value="yes">Eligible</SelectItem>
              <SelectItem value="no">Not eligible</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[220px] bg-white">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
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
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Survey</TableHead>
                <TableHead>Class complete</TableHead>
                <TableHead>Eligible</TableHead>
                <TableHead className="text-right">Issue</TableHead>
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
                    <TableCell>{c.surveyComplete ? "Done" : "Missing"}</TableCell>
                    <TableCell>{c.courseComplete ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {c.eligible ? (
                        <Badge className="bg-emerald-600">Eligible</Badge>
                      ) : (
                        <Badge variant="secondary">Not eligible</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!c.eligible}
                        title={!c.eligible ? "Complete survey and class first" : undefined}
                        onClick={() => toast.success("Certificate issued (demo)", { description: `${c.studentName} — ${c.course}` })}
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
