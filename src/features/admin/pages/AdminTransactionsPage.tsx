import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { mockAdminTransactions } from "@/features/admin/data/adminOperationalMock";
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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function AdminTransactionsPage() {
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
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Transactions"
          description="Recorded movements (demo). Pair with Payments for reconciliation when the ledger API is live."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center mb-4">
          <Input
            placeholder="Search reference, student, amount, method…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-white"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
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
                <TableHead>Reference</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No transactions match your search or filters.
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
    </AdminLayout>
  );
}
