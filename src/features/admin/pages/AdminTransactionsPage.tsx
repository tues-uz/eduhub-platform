import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminTransactions } from "@/features/admin/data/adminOperationalMock";
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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function AdminTransactionsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const methodOptions = useMemo(() => {
    const names = new Set(mockAdminTransactions.map((t) => t.method));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const typeOptions = useMemo(() => {
    const names = new Set(mockAdminTransactions.map((t) => t.type));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, []);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAdminTransactions.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (methodFilter !== "all" && t.method !== methodFilter) return false;
      if (!q) return true;
      const haystack = [t.ref, t.studentName, t.type, t.method, formatMoney(t.amount, t.currency), t.recordedAt]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, typeFilter, methodFilter]);

  const hasActiveFilters =
    search.trim() !== "" || typeFilter !== "all" || methodFilter !== "all";

  return (
      <div className="container mx-auto px-6">

        <AdminPageHeader
          title={t("adminNav.transactions")}
          description={t("admin.transactions.description")}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder={t("admin.transactions.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder={t("admin.transactions.typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allTypes")}</SelectItem>
              {typeOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder={t("admin.transactions.methodPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.shared.allMethods")}</SelectItem>
              {methodOptions.map((name) => (
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
                setTypeFilter("all");
                setMethodFilter("all");
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
                <TableHead>{t("admin.transactions.table.reference")}</TableHead>
                <TableHead>{t("admin.shared.student")}</TableHead>
                <TableHead>{t("admin.transactions.table.type")}</TableHead>
                <TableHead>{t("admin.shared.amount")}</TableHead>
                <TableHead>{t("admin.transactions.table.method")}</TableHead>
                <TableHead>{t("admin.transactions.table.recorded")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    {t("admin.transactions.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-slate-700">{t.ref}</TableCell>
                    <TableCell className="font-medium text-slate-900">{t.studentName}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{formatMoney(t.amount, t.currency)}</TableCell>
                    <TableCell>{t.method}</TableCell>
                    <TableCell className="text-slate-600">{t.recordedAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}
