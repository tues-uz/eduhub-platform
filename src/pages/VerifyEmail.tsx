import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Loader2 } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import EduHubHeader from "@/components/EduHubHeader";
import { eduhubAuth } from "@/api/eduhubClient";

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const mounted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage(t("auth.verifyEmail.noToken"));
      return;
    }

    if (mounted.current) return;
    mounted.current = true;

    const verifyToken = async () => {
      try {
        await eduhubAuth.verifyEmail(token);
        setStatus("success");
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : t("auth.verifyEmail.verifyFailed"));
      }
    };

    verifyToken();
  }, [token, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EduHubHeader />

      <main className="min-h-dvh pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 text-center">
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <h1 className="text-2xl font-bold text-foreground">{t("auth.verifyEmail.loadingTitle")}</h1>
                <p className="text-foreground/70">{t("auth.verifyEmail.loadingDesc")}</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h1 className="text-2xl font-bold text-foreground">{t("auth.verifyEmail.successTitle")}</h1>
                <p className="text-foreground/70">{t("auth.verifyEmail.successDesc")}</p>
                <Link to="/signin" className="mt-4 w-full">
                  <Button className="w-full h-12 rounded-full text-white font-semibold text-base" style={{ backgroundColor: "#1e40af" }}>
                    {t("auth.verifyEmail.goToSignIn")}
                  </Button>
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <XCircle className="h-16 w-16 text-red-500" />
                <h1 className="text-2xl font-bold text-foreground">{t("auth.verifyEmail.failedTitle")}</h1>
                <p className="text-red-600/90">{errorMessage}</p>
                <Link to="/signin" className="mt-4 w-full">
                  <Button variant="outline" className="w-full h-12 rounded-full font-semibold text-base border-gray-300">
                    {t("auth.verifyEmail.backToSignIn")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyEmail;
