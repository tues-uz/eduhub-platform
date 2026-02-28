import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Dummy account credentials (role: student | admin | teacher)
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
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      // Check if credentials match any dummy account
      const account = DUMMY_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase().trim() === email.toLowerCase().trim() && acc.password === password
      );

      if (account) {
        localStorage.setItem("userName", account.name);
        localStorage.setItem("userEmail", account.email);
        localStorage.setItem("userRole", account.role);
        toast({
          title: "Welcome back!",
          description: `Successfully signed in as ${account.name}`,
        });
        setIsLoading(false);
        const redirect =
          account.role === "admin" ? "/dashboard/admin" :
          account.role === "teacher" ? "/dashboard/teacher" : "/dashboard";
        setTimeout(() => navigate(redirect), 500);
      } else {
        // Error - show error message
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        toast({
          title: "Sign in failed",
          description: "Invalid email or password. Please check your credentials.",
          variant: "destructive",
        });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <main className="pt-16 pb-20 min-h-screen">
        <div className="container mx-auto px-6">
          {/* Sign In Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-gray-200 p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'Fredoka One', cursive", fontWeight: 400, letterSpacing: '0.5px' }}>Welcome Back</h1>
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
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      className={`pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary ${
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
                      className={`pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary ${
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
                    to="#"
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
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-foreground/50">Or continue with</span>
                </div>
              </div>

              {/* Social Sign In */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-lg border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </div>

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
