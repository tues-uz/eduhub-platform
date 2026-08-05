import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminCalendarEvents } from "@/features/admin/data/adminOperationalMock";
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

export default function AdminCalendarPage() {
  const { t } = useTranslation();
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
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("adminNav.calendar")}
          description={t("admin.calendar.description")}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.calendar.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder={t("admin.calendar.eventTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allTypes")}</SelectItem>
              <SelectItem value="class">{t("admin.shared.class")}</SelectItem>
              <SelectItem value="test">{t("admin.calendar.types.test")}</SelectItem>
              <SelectItem value="review">{t("admin.shared.review")}</SelectItem>
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
            <div className="px-6 py-12 text-center text-slate-500 text-sm">{t("admin.calendar.empty")}</div>
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
  );
}
