import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export default function AdminReportsPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto px-6">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Reports & analytics"
          description="High-level KPIs and exports will connect to reporting APIs. Below is a placeholder layout."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active enrollments", value: "312", hint: "demo" },
            { label: "Overdue payments", value: "18", hint: "demo" },
            { label: "Certificates (30d)", value: "42", hint: "demo" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{k.hint}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{k.value}</p>
              <p className="text-sm text-slate-600 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
