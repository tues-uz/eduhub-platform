import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eduhubAdmin } from "@/api/eduhubClient";
import { User } from "lucide-react";
import { adminTeachersStore } from "@/features/admin/data/adminTeachersStore";

/** Values are sent to `POST /admin/users`. Align with your API’s role enum (e.g. Spring `Role` names). */
const ADD_USER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "LECTURER", label: "Teacher" },
  { value: "ADMIN_FINANCE", label: "Admin Finance" },
  { value: "ADMIN_CONTENT", label: "Admin Content" },
  { value: "ADMIN_SUPPORT", label: "Admin Support" },
  { value: "ADMIN_ANALYTIC", label: "Admin Analytic" },
];

export default function AdminAddUserRolePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    role: "",
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.role) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await eduhubAdmin.createUser(formData);
      if (formData.role === "LECTURER") {
        adminTeachersStore.upsertByEmail({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          coursesTaught: [],
          totalStudents: 0,
          status: "Active",
        });
      }
      toast.success(`${formData.role} account created successfully`);
      navigate("/dashboard/admin");
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-6 max-w-lg">
        <Link to="/dashboard/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <AdminPageHeader
          title="Add user role"
          description="Create a new user account with assigned role. Default password will be 'pleasechangeme123!' If the API rejects a role, confirm the backend supports that role value (e.g. ADMIN_FINANCE)."
        />

        <form
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleChange}
                className="pl-10 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="user@school.com"
              value={formData.email}
              onChange={handleChange}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                placeholder="+6281234567890"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="pl-10 bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              required
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ADD_USER_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? "Creating..." : "Create User"}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
