"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, CheckCircle } from "lucide-react";
import { SvgLoader } from "@/components/ui/svg-loader";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";

export default function AuthLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const analytics = useAnalytics();

  const [status, setStatus] = useState<"verifying" | "success">(
    "verifying"
  );
  const hasProcessedToken = useRef(false);

  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const urlParam = useMemo(() => searchParams.get("url") || "", [searchParams]);

  useEffect(() => {
    // Prevent processing the same token multiple times
    if (hasProcessedToken.current) return;

    if (!token) {
      // Redirect to auth page if no token provided
      const savedEmail = localStorage.getItem("userEmail") || "";
      router.push(`/auth?url=${encodeURIComponent(urlParam)}${savedEmail ? `&email=${encodeURIComponent(savedEmail)}` : ""}`);
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
          // Redirect to auth page on failure
          analytics.trackError('auth_login_failed', 'Invalid or expired authentication link');
          // Try to get email from localStorage to pre-fill the form
          const savedEmail = localStorage.getItem("userEmail") || "";
          router.push(`/auth?url=${encodeURIComponent(urlParam)}${savedEmail ? `&email=${encodeURIComponent(savedEmail)}` : ""}`);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        // Redirect to auth page on error
        const savedEmail = localStorage.getItem("userEmail") || "";
        router.push(`/auth?url=${encodeURIComponent(urlParam)}${savedEmail ? `&email=${encodeURIComponent(savedEmail)}` : ""}`);
      }
    };

    authenticateUser();
  }, [token, login, router, urlParam, analytics]);

  const handleContinue = () => {
    router.push(`/home`);
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

          </div>
        </div>
      </div>

      <p className="mt-8 text-mono-500 text-sm">
        © {new Date().getFullYear()} Mint. All rights reserved.
      </p>
    </div>
  );
}
