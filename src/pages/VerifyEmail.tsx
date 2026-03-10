import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EduHubHeader from "@/components/EduHubHeader";
import { eduhubAuth } from "@/api/eduhubClient";

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const mounted = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setErrorMessage("No verification token provided.");
            return;
        }

        if (mounted.current) return;
        mounted.current = true;

        const verifyToken = async () => {
            try {
                await eduhubAuth.verifyEmail(token);
                setStatus("success");
            } catch (err: any) {
                setStatus("error");
                setErrorMessage(err.message || "Failed to verify email. The link may have expired.");
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <EduHubHeader />

            <main className="pt-32 pb-20">
                <div className="container mx-auto px-6">
                    <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8 text-center">

                        {status === "loading" && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                <h1 className="text-2xl font-bold text-foreground">Verifying your email...</h1>
                                <p className="text-foreground/70">Please wait while we confirm your email address.</p>
                            </div>
                        )}

                        {status === "success" && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                                <h1 className="text-2xl font-bold text-foreground">Email Verified!</h1>
                                <p className="text-foreground/70">Thank you for verifying your email address. You can now sign in to your account.</p>
                                <Link to="/signin" className="mt-4 w-full">
                                    <Button className="w-full h-12 rounded-full text-white font-semibold text-base" style={{ backgroundColor: '#1e40af' }}>
                                        Go to Sign In
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                                <XCircle className="h-16 w-16 text-red-500" />
                                <h1 className="text-2xl font-bold text-foreground">Verification Failed</h1>
                                <p className="text-red-600/90">{errorMessage}</p>
                                <Link to="/signin" className="mt-4 w-full">
                                    <Button variant="outline" className="w-full h-12 rounded-full font-semibold text-base border-gray-300">
                                        Back to Sign In
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
