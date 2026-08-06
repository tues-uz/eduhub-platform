import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { eduhubAdminSupport } from "@/api/eduhubClient";
import type { AdminSupportSessionResponse as AdminSupportSession } from "@/api/eduhubTypes";
import { Loader2, Calendar, CheckCircle2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

export default function AdminSupportSessionsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sessionsList, setSessionsList] = useState<AdminSupportSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot modal state
  const [activeSession, setActiveSession] = useState<AdminSupportSession | null>(null);
  const [meetingSlotInput, setMeetingSlotInput] = useState("");
  const [updatingSlot, setUpdatingSlot] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eduhubAdminSupport.listAll();
      setSessionsList(data || []);
    } catch {
      setSessionsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleApprove = async (id: string, name: string) => {
    try {
      await eduhubAdminSupport.approve(id);
      toast.success(`Support session for ${name} approved & scheduled`);
      fetchSessions();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to approve support session");
    }
  };

  const handleOpenSlotModal = (s: AdminSupportSession) => {
    setActiveSession(s);
    setMeetingSlotInput(s.scheduledSlot || "Friday · 15:00 PM");
  };

  const handleSaveSlot = async () => {
    if (!activeSession || !meetingSlotInput.trim()) return;
    setUpdatingSlot(true);
    try {
      await eduhubAdminSupport.scheduleSlot(activeSession.id, meetingSlotInput.trim());
      toast.success("Meeting slot updated successfully");
      setActiveSession(null);
      fetchSessions();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update slot");
    } finally {
      setUpdatingSlot(false);
    }
  };

  const courseOptions = useMemo(() => {
    const names = new Set(sessionsList.map((s) => s.course));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sessionsList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessionsList.filter((s) => {
      if (statusFilter === "requested" && s.status !== "requested") return false;
      if (statusFilter === "scheduled" && s.status !== "scheduled") return false;
      if (courseFilter !== "all" && s.course !== courseFilter) return false;
      if (!q) return true;
      return [s.studentName, s.course, s.topic, s.requestedAt].join(" ").toLowerCase().includes(q);
    });
  }, [search, statusFilter, courseFilter, sessionsList]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || courseFilter !== "all";

  return (
    <div className="container mx-auto px-6">
      <AdminPageHeader
        title={t("admin.supportSessions.title")}
        description={t("admin.supportSessions.description")}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
        <Input
          placeholder={t("admin.supportSessions.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-white"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.shared.allStatuses")}</SelectItem>
            <SelectItem value="requested">{t("admin.payroll.requests.table.requested")}</SelectItem>
            <SelectItem value="scheduled">{t("admin.supportSessions.scheduled")}</SelectItem>
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
              setStatusFilter("all");
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
              <TableHead>{t("admin.supportSessions.table.topic")}</TableHead>
              <TableHead>{t("admin.payroll.requests.table.requested")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading support sessions...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  {t("admin.supportSessions.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-slate-900">{s.studentName}</TableCell>
                  <TableCell>{s.course}</TableCell>
                  <TableCell className="max-w-[220px]">{s.topic}</TableCell>
                  <TableCell className="text-slate-600">{s.requestedAt}</TableCell>
                  <TableCell>
                    {s.status === "scheduled" ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Scheduled
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("admin.payroll.requests.table.requested")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "requested" ? (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(s.id, s.studentName)}>
                        Approve & schedule
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleOpenSlotModal(s)}>
                        <Calendar className="h-4 w-4 mr-1.5" />
                        View slot
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Meeting Slot Modal */}
      <Dialog open={!!activeSession} onOpenChange={(open) => !open && setActiveSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Schedule Support Meeting
            </DialogTitle>
            <DialogDescription>
              Assign a meeting time slot for {activeSession?.studentName} ({activeSession?.course})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
                Scheduled Slot / Time
              </label>
              <Input
                value={meetingSlotInput}
                onChange={(e) => setMeetingSlotInput(e.target.value)}
                placeholder="e.g. Friday · 15:00 PM"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveSession(null)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSaveSlot}
              disabled={!meetingSlotInput.trim() || updatingSlot}
            >
              {updatingSlot ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Meeting Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

