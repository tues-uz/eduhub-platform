import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard } from "@/lib/icons";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isLoggedIn = typeof window !== "undefined" && (localStorage.getItem("userEmail") ?? "").length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-6">
      <div className="text-center">
        <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">{t("notFound.title")}</p>
        <p className="mb-8 text-sm text-muted-foreground/80">{t("notFound.description")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button className="rounded-full" variant="default">
              <Home className="mr-2 h-4 w-4" />
              {t("notFound.returnHome")}
            </Button>
          </Link>
          {isLoggedIn && (
            <Link to="/dashboard">
              <Button className="rounded-full" variant="outline">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t("common.dashboard")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
