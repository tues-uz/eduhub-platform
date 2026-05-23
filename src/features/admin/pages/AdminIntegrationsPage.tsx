import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "@/lib/icons";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LMS_URL = "https://lms.example.com/sso";

export default function AdminIntegrationsPage() {
  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-2xl">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Integrations & LMS"
          description="External LMS links and trial policy. Values are typically loaded from environment or admin settings API."
        />

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="lms-url">LMS base URL</Label>
            <div className="flex gap-2">
              <Input id="lms-url" readOnly value={LMS_URL} className="bg-slate-50 font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" asChild>
                <a href={LMS_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-slate-500">Students open this from their dashboard; admins use it for support.</p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900 mb-1">Free trial policy</p>
            <p>One trial per account. The student profile shows whether the trial has been consumed; blocking a second trial is enforced server-side.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
