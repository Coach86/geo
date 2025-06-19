"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, CheckCircle, XCircle } from "lucide-react";
import { SvgLoader } from "@/components/ui/svg-loader";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";

export default function AuthLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const analytics = useAnalytics();

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [error, setError] = useState<string | null>(null);
  const hasProcessedToken = useRef(false);

  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const urlParam = useMemo(() => searchParams.get("url") || "", [searchParams]);

  useEffect(() => {
    // Prevent processing the same token multiple times
    if (hasProcessedToken.current) return;

    if (!token) {
      setStatus("error");
      setError("No authentication token provided");
      return;
    }

    hasProcessedToken.current = true;

    const authenticateUser = async () => {
      try {
        const success = await login(token);

        if (success) {
          setStatus("success");
          // Track successful login
          analytics.trackLogin('email');
          // Clear promo code from localStorage after successful login
          localStorage.removeItem("promoCode");
          // Redirect after a short delay to show success message
          setTimeout(() => {
            router.push(`/?url=${encodeURIComponent(urlParam)}`);
          }, 1500);
        } else {
          setStatus("error");
          setError("Invalid or expired authentication link");
          analytics.trackError('auth_login_failed', 'Invalid or expired authentication link');
          hasProcessedToken.current = false; // Allow retry
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        setError("Failed to authenticate");
        hasProcessedToken.current = false; // Allow retry
      }
    };

    authenticateUser();
  }, [token, login]);

  const handleContinue = () => {
    router.push(`/home`);
  };

  const handleBackToAuth = () => {
    router.push(`/auth?url=${encodeURIComponent(urlParam)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center">
        <img src={'/logo-small.png'} style={{height: 30}} alt="logo"/>
      </div>

      {/* Authentication Card */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="text-center">
            {status === "verifying" && (
              <>
                <SvgLoader className="text-accent-500 mx-auto mb-4" size="lg" />
                <h1 className="text-2xl font-bold text-mono-900 mb-2">
                  Signing you in...
                </h1>
                <p className="text-mono-600">
                  Please wait while we authenticate your account.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-mono-900 mb-2">
                  Welcome to Mint!
                </h1>
                <p className="text-mono-600 mb-6">
                  You've been successfully authenticated. Taking you to the
                  app...
                </p>
                <Button
                  onClick={handleContinue}
                  className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-white"
                >
                  Continue to Dashboard
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-mono-900 mb-2">
                  Authentication Failed
                </h1>
                <p className="text-mono-600 mb-6">
                  {error ||
                    "Unable to authenticate your account. The link may have expired or already been used."}
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={handleBackToAuth}
                    className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-white"
                  >
                    Request New Magic Link
                  </Button>
                  <Button
                    onClick={handleContinue}
                    variant="outline"
                    className="w-full h-12"
                  >
                    Continue Anyway
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-8 text-mono-500 text-sm">
        © {new Date().getFullYear()} Mint. All rights reserved.
      </p>
    </div>
  );
}
