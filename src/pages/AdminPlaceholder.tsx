import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SECTION_TITLES: Record<string, string> = {
  users: "Users",
  courses: "Classes",
  analytics: "Analytics",
  settings: "Settings",
};

const AdminPlaceholder = () => {
  const location = useLocation();
  const segment = location.pathname.split("/").pop() ?? "";
  const title = SECTION_TITLES[segment] ?? "Admin";

  return (
    <div className="container mx-auto px-6">
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1
          className="mb-2 text-2xl font-bold text-foreground"
          style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: "0.5px" }}
        >
          {title}
        </h1>
        <p className="mb-6 text-foreground/60">This section is coming soon.</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/dashboard/admin">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default AdminPlaceholder;
