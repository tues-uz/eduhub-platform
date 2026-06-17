import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth } from "@/api/eduhubClient";
import { appRoutes } from "@/app/routes";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const trimmedEmail = email.trim();

    try {
      await eduhubAuth.requestPasswordReset({ email: trimmedEmail });
    } catch {
      // Always show success to avoid revealing whether the email is registered.
    } finally {
      setIsLoading(false);
      setIsSuccess(true);
      toast({
        title: "Check your email",
        description: "If an account exists for that address, we sent password reset instructions.",
      });
    }
  };

  return (
    <div className="h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex h-dvh items-center overflow-y-auto">
        <div className="container mx-auto w-full px-6 py-6">
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-gray-200 p-8">
              {isSuccess ? (
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
                    <p className="text-foreground/70 text-sm">
                      If an account exists for <strong>{email.trim()}</strong>, we sent a link to reset your
                      password. The link expires after a short time.
                    </p>
                  </div>
                  <p className="text-foreground/60 text-xs">
                    Did not receive it? Check your spam folder or try again with the same email.
                  </p>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-full border-gray-200 font-semibold hover:bg-gray-50"
                      onClick={() => {
                        setIsSuccess(false);
                        setError("");
                      }}
                    >
                      Send again
                    </Button>
                    <Button
                      type="button"
                      className="w-full h-12 rounded-full text-white font-semibold"
                      style={{ backgroundColor: "#3954d0" }}
                      asChild
                    >
                      <Link to={appRoutes.signIn}>Back to Sign In</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <img
                      src="/logo-eduhub.png"
                      alt="EduHub"
                      className="mx-auto mb-4 h-12 w-auto object-contain"
                    />
                    <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h1>
                    <p className="text-foreground/70 text-sm">
                      Enter your email and we will send you a link to reset your password.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#3954d0" }}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 rounded-full border-gray-200 font-semibold hover:bg-gray-50"
                      asChild
                    >
                      <Link to={appRoutes.signIn}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Sign In
                      </Link>
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
