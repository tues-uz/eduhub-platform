import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isLoggedIn = typeof window !== "undefined" && (localStorage.getItem("userEmail") ?? "").length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-6">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <p className="mb-8 text-sm text-muted-foreground/80">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button className="rounded-full" variant="default">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </Link>
          {isLoggedIn && (
            <Link to="/dashboard">
              <Button className="rounded-full" variant="outline">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
