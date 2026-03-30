import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminCalendarEvents } from "@/features/admin/data/adminOperationalMock";
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

export default function AdminCalendarPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminCalendarEvents.filter((ev) => {
      if (typeFilter !== "all" && ev.type !== typeFilter) return false;
      if (!q) return true;
      const timeStr = `${format(parseISO(ev.start), "PPp")} ${format(parseISO(ev.end), "p")}`.toLowerCase();
      return [ev.title, ev.type, timeStr].join(" ").toLowerCase().includes(q);
    });
  }, [search, typeFilter]);

  const hasActiveFilters = search.trim() !== "" || typeFilter !== "all";

  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Calendar"
          description="Class schedules, placement or mock tests, and review sessions. Drill through to the class or student when wired to routes."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder="Search title, type, time…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="class">Class</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="review">Review</SelectItem>
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
                setTypeFilter("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-200">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 text-sm">No events match your search or filters.</div>
          ) : (
            filtered.map((ev) => (
              <div key={ev.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{ev.title}</p>
                  <p className="text-sm text-slate-500">
                    {format(parseISO(ev.start), "PPp")} – {format(parseISO(ev.end), "p")}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize w-fit">
                  {ev.type}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
