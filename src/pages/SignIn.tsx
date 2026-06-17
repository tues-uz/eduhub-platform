import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth, setAuthTokens } from "@/api/eduhubClient";
import { appRoutes } from "@/app/routes";
import { resolveAvatarFromAuthResponse, setSessionUser, useAuthSession } from "@/features/auth/context";
import type { UserRole } from "@/features/auth/types";
import { resolveInstructorCategory } from "@/features/teacher/resolveInstructorCategory";

function mapApiRoleToApp(apiRole: string): UserRole {
  if (apiRole === "LECTURER") return "teacher";
  if (apiRole === "ADMIN") return "admin";
  return "student";
}

function safeInternalPath(p: string | null): string | null {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return null;
  return p;
}

// Fallback dummy accounts when API is unavailable or for demo
const DUMMY_ACCOUNTS = [
  { email: "Sevinch@eduhub.com", password: "demo123", name: "Sevinch", role: "student" as const },
  { email: "student@tues.uz", password: "student123", name: "Student Account", role: "student" as const },
  { email: "admin@eduhub.com", password: "admin123", name: "Admin Account", role: "admin" as const },
  { email: "teacher@eduhub.com", password: "teacher123", name: "Teacher Account", role: "teacher" as const },
];

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { refreshUser } = useAuthSession();
  const nextPath = useMemo(
    () => safeInternalPath(searchParams.get("redirect") ?? searchParams.get("next")),
    [searchParams],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await eduhubAuth.login({ identifier: email.trim(), password });
      setAuthTokens(res.accessToken, res.refreshToken, res.expiresIn);
      const role = mapApiRoleToApp(res.user.role);
      const emailLower = res.user.email.trim().toLowerCase();
      const fromRegistration = localStorage.getItem(`eduhub_registration_phone_${emailLower}`);
      const category =
        role === "teacher" ? resolveInstructorCategory(res.user.email, res.user.category) : undefined;
      setSessionUser({
        id: res.user.id,
        name: res.user.fullName,
        email: res.user.email,
        role,
        avatarUrl: resolveAvatarFromAuthResponse(res.user.avatarUrl, res.user.email),
        phoneNumber: res.user.phoneNumber ?? fromRegistration ?? localStorage.getItem("userPhone") ?? undefined,
        category,
      });
      refreshUser();
      
      if (res.mustChangePassword) {
        toast({ title: "Password change required", description: "You must change your password before continuing." });
        navigate("/change-password");
        return;
      }
      
      toast({ title: "Welcome back!", description: `Signed in as ${res.user.fullName}` });
      const fallback =
        role === "admin" ? "/dashboard/admin" : role === "teacher" ? "/dashboard/teacher" : "/dashboard";
      navigate(role === "student" && nextPath ? nextPath : fallback);
    } catch {
      // Fallback to dummy accounts
      const account = DUMMY_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase().trim() === email.toLowerCase().trim() && acc.password === password
      );
      if (account) {
        const regPhone = localStorage.getItem(`eduhub_registration_phone_${account.email.toLowerCase()}`);
        const category =
          account.role === "teacher" ? resolveInstructorCategory(account.email) : undefined;
        setSessionUser({
          name: account.name,
          email: account.email,
          role: account.role,
          phoneNumber: regPhone ?? undefined,
          category,
        });
        refreshUser();
        toast({ title: "Welcome back!", description: `Signed in as ${account.name} (demo)` });
        const fallback =
          account.role === "admin"
            ? "/dashboard/admin"
            : account.role === "teacher"
              ? "/dashboard/teacher"
              : "/dashboard";
        navigate(account.role === "student" && nextPath ? nextPath : fallback);
      } else {
        setError("Invalid email or password. Please try again.");
        toast({ title: "Sign in failed", description: "Invalid email or password.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex h-dvh items-center overflow-y-auto">
        <div className="container mx-auto w-full px-6 py-6">
          {/* Sign In Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-gray-200 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <img
                  src="/logo-eduhub.png"
                  alt="EduHub"
                  className="mx-auto mb-4 h-12 w-auto object-contain"
                />
                <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.5px' }}>Welcome Back</h1>
                <p className="text-foreground/70 text-sm">
                  Sign in to your account to continue learning
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="identifier" className="text-sm font-medium text-foreground">
                    Email or Phone Number
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="Enter your email or phone number"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      className={`pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary ${
                        error ? "border-red-300" : ""
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className={`pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary ${
                        error ? "border-red-300" : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded appearance-none bg-white border border-black/40 checked:bg-white checked:border-black/40 focus:ring-primary"
                      style={{ backgroundImage: 'none' }}
                    />
                    <span className="text-foreground/70">Remember me</span>
                  </label>
                  <Link
                    to={appRoutes.forgotPassword}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#3954d0' }}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-full border-gray-200 font-semibold hover:bg-gray-50"
                  asChild
                >
                  <Link to={appRoutes.home}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                </Button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center text-sm">
                <span className="text-foreground/70">Don't have an account? </span>
                <Link
                  to="/register"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignIn;
