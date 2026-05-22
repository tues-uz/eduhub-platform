import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Phone, IdCard, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth } from "@/api/eduhubClient";
import { saveRegistrationPhones } from "@/features/auth/registrationPhoneStorage";
import EduHubHeader from "@/components/EduHubHeader";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    passportNumber: "",
    dateOfBirth: "",
    birthCity: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await eduhubAuth.register({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        parentPhoneNumber: formData.parentPhoneNumber,
        passportNumber: formData.passportNumber,
        dateOfBirth: formData.dateOfBirth,
        password: formData.password,
        role: "STUDENT",
      });
      saveRegistrationPhones(formData.email, {
        phoneNumber: formData.phoneNumber,
        parentPhoneNumber: formData.parentPhoneNumber,
        passportNumber: formData.passportNumber,
        dateOfBirth: formData.dateOfBirth,
        birthCity: formData.birthCity,
      });
      setIsSuccess(true);
      toast({ title: "Registration successful", description: "Please check your email to verify your account." });
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <EduHubHeader />

      <main className="min-h-dvh pt-24 pb-20">
        <div className="container mx-auto px-6">
          {/* Sign Up Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
              {/* Success Message UI */}
              {isSuccess ? (
                <div className="text-center space-y-6 py-8">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Check Your Email</h2>
                  <p className="text-foreground/70">
                    We've sent a verification link to <strong>{formData.email}</strong>.
                    Please verify your email address before signing in.
                  </p>
                  <Button
                    onClick={() => navigate("/signin")}
                    className="w-full h-12 rounded-full text-white font-semibold mt-4"
                    style={{ backgroundColor: '#1e40af' }}
                  >
                    Go to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, letterSpacing: '0.5px' }}>Create Account</h1>
                    <p className="text-foreground/70 text-sm">
                      Join us and start your learning journey today
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Sign Up Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Full Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="fullName"
                          name="fullName"
                          type="text"
                          placeholder="Enter your full name"
                          value={formData.fullName}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone Number Field */}
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
                        Your phone number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Parent phone */}
                    <div className="space-y-2">
                      <Label htmlFor="parentPhoneNumber" className="text-sm font-medium text-foreground">
                        Parent phone number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="parentPhoneNumber"
                          name="parentPhoneNumber"
                          type="tel"
                          placeholder="Parent or guardian contact number"
                          value={formData.parentPhoneNumber}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    {/* Passport number */}
                    <div className="space-y-2">
                      <Label htmlFor="passportNumber" className="text-sm font-medium text-foreground">
                        Passport number
                      </Label>
                      <div className="relative">
                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="passportNumber"
                          name="passportNumber"
                          type="text"
                          placeholder="Enter your passport number"
                          value={formData.passportNumber}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Date of birth */}
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
                        Date of birth
                      </Label>
                      <p className="text-xs text-foreground/60">
                        So admin can verify your age for enrollment and programs.
                      </p>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          max={new Date().toISOString().slice(0, 10)}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Born city */}
                    <div className="space-y-2">
                      <Label htmlFor="birthCity" className="text-sm font-medium text-foreground">
                        Born city
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="birthCity"
                          name="birthCity"
                          type="text"
                          placeholder="City where you were born"
                          value={formData.birthCity}
                          onChange={handleChange}
                          className="pl-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                          autoComplete="address-level2"
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
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={formData.password}
                          onChange={handleChange}
                          className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
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

                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-primary focus:ring-primary"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id="terms"
                        className="w-4 h-4 mt-0.5 rounded appearance-none bg-white border border-black/40 checked:bg-white checked:border-black/40 focus:ring-primary"
                        style={{ backgroundImage: 'none' }}
                        required
                      />
                      <label htmlFor="terms" className="text-foreground/70 cursor-pointer">
                        I agree to the{" "}
                        <Link to="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#1e40af' }}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
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

                  {/* Social Sign Up */}
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

                  {/* Sign In Link */}
                  <div className="mt-8 text-center text-sm">
                    <span className="text-foreground/70">Already have an account? </span>
                    <Link
                      to="/signin"
                      className="text-primary hover:text-primary/80 font-semibold transition-colors"
                    >
                      Sign in
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
