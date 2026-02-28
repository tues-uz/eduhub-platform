import { useState, useEffect } from "react";
import { User, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import DashboardSidebar from "@/components/DashboardSidebar";

const StudentSettings = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [courseReminders, setCourseReminders] = useState(true);

  useEffect(() => {
    const check = () => setIsSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const id = setInterval(check, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setName(localStorage.getItem("userName") || "");
    setEmail(localStorage.getItem("userEmail") || "");
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) localStorage.setItem("userName", name);
    if (email) localStorage.setItem("userEmail", email);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Comfortaa', cursive" }}>
      <DashboardSidebar />
      <main className={`pt-16 lg:pt-6 pb-20 transition-all duration-300 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: "0.5px", fontSize: "32px" }}>
              Settings
            </h1>
            <p className="text-foreground/70 text-sm">Manage your account and preferences.</p>
          </div>
          <form onSubmit={handleSave} className="space-y-8">
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                <User className="h-5 w-5" />
                Profile
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200/50 bg-white/80 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400 }}>
                <Bell className="h-5 w-5" />
                Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email notifications</p>
                    <p className="text-sm text-foreground/60">Receive updates and announcements by email.</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Course reminders</p>
                    <p className="text-sm text-foreground/60">Reminders for assignments and live sessions.</p>
                  </div>
                  <Switch checked={courseReminders} onCheckedChange={setCourseReminders} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-full" style={{ backgroundColor: "#3954d0" }}>
                <Save className="mr-2 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default StudentSettings;
