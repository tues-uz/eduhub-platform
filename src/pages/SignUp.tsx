import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, Phone, IdCard, Calendar, MapPin, GraduationCap, AlertCircle, ShieldCheck, ArrowLeft } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eduhubAuth } from "@/api/eduhubClient";
import { saveRegistrationPhones } from "@/features/auth/registrationPhoneStorage";

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
    latestSchool: "",
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
        birthCity: formData.birthCity,
        latestSchool: formData.latestSchool,
        password: formData.password,
        role: "STUDENT",
      });
      saveRegistrationPhones(formData.email, {
        phoneNumber: formData.phoneNumber,
        parentPhoneNumber: formData.parentPhoneNumber,
        passportNumber: formData.passportNumber,
        dateOfBirth: formData.dateOfBirth,
        birthCity: formData.birthCity,
        latestSchool: formData.latestSchool,
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
    <div className="min-h-dvh bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <main className="flex min-h-dvh items-center overflow-y-auto py-6">
        <div className="container mx-auto w-full px-6">
          {/* Sign Up Card */}
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 md:p-10">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-6 top-6 md:left-8 md:top-8 z-10 h-10 w-10 shrink-0 rounded-full border-gray-200 hover:bg-gray-50"
                asChild
              >
                <Link to="/signin" aria-label="Back to sign in">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
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
                  <div className="mb-6 border-b border-gray-200/60 pb-6 text-center">
                    <img
                      src="/logo-eduhub.png"
                      alt="EduHub"
                      className="mx-auto mb-4 h-12 w-auto object-contain"
                    />
                    <div className="space-y-1">
                      <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.5px' }}>Create Account</h1>
                      <p className="text-sm text-foreground/70">
                        Join us and start your learning journey today
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Sign Up Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-0 gap-y-8 md:gap-y-5">
                      {/* Left column — personal details */}
                      <div className="space-y-5 md:pr-10 md:border-r md:border-gray-200/60">
                        <div>
                          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <User className="h-4 w-4 text-[#1e40af]" />
                            Personal Details
                          </h2>
                          <p className="mt-1 text-xs text-foreground/60">Contact and identity information</p>
                        </div>

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
                              className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="passportNumber" className="text-sm font-medium text-foreground">
                              Passport Number
                            </Label>
                            <div className="relative">
                              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                              <Input
                                id="passportNumber"
                                name="passportNumber"
                                type="text"
                                placeholder="Passport number"
                                value={formData.passportNumber}
                                onChange={handleChange}
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                                required
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-sm font-medium text-foreground">
                              Your Phone Number
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                              <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                placeholder="Your number"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="parentPhoneNumber" className="text-sm font-medium text-foreground">
                              Parent Phone Number
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                              <Input
                                id="parentPhoneNumber"
                                name="parentPhoneNumber"
                                type="tel"
                                placeholder="Parent / guardian"
                                value={formData.parentPhoneNumber}
                                onChange={handleChange}
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                                required
                                autoComplete="tel"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right column — education & account */}
                      <div className="space-y-5 md:pl-10">
                        <div>
                          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-[#1e40af]" />
                            Education & Account
                          </h2>
                          <p className="mt-1 text-xs text-foreground/60">Background details and login credentials</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
                              Date of Birth
                            </Label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
                              <Input
                                id="dateOfBirth"
                                name="dateOfBirth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                max={new Date().toISOString().slice(0, 10)}
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="birthCity" className="text-sm font-medium text-foreground">
                              Born City
                            </Label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                              <Input
                                id="birthCity"
                                name="birthCity"
                                type="text"
                                placeholder="City of birth"
                                value={formData.birthCity}
                                onChange={handleChange}
                                className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                                required
                                autoComplete="address-level2"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="latestSchool" className="text-sm font-medium text-foreground">
                            Latest school, university or institution
                          </Label>
                          <div className="relative">
                            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                            <Input
                              id="latestSchool"
                              name="latestSchool"
                              type="text"
                              placeholder="Your most recent school, university or institution"
                              value={formData.latestSchool}
                              onChange={handleChange}
                              className="pl-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
                              required
                              autoComplete="organization"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
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
                                placeholder="Confirm password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-primary focus:ring-primary"
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
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 border-t border-gray-200/60 pt-6">
                    {/* Terms and Conditions */}
                    <div className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id="terms"
                        className="w-4 h-4 mt-0.5 shrink-0 rounded appearance-none bg-white border border-black/40 checked:bg-white checked:border-black/40 focus:ring-primary"
                        required
                      />
                      <label htmlFor="terms" className="cursor-pointer text-foreground/70">
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

                    {/* Actions */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-12 w-full rounded-full text-white font-semibold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#1e40af' }}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                    </div>
                  </form>

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
