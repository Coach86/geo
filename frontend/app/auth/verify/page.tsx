"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const urlParam = searchParams.get("url") || "";

    if (!token) {
      setStatus("error");
      setError("No token provided");
      return;
    }

    const verifyToken = async () => {
      try {
        const success = await login(token);

        if (success) {
          setStatus("success");
          // Redirect after a short delay to show success message
          setTimeout(() => {
            router.push(`/onboarding?url=${encodeURIComponent(urlParam)}`);
          }, 2000);
        } else {
          setStatus("error");
          setError("Invalid or expired token");
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setStatus("error");
        setError("Failed to verify token");
      }
    };

    verifyToken();
  }, [searchParams, login, router]);

  const handleContinue = () => {
    const urlParam = searchParams.get("url") || "";
    router.push(`/onboarding?url=${encodeURIComponent(urlParam)}`);
  };

  const handleBackToAuth = () => {
    const urlParam = searchParams.get("url") || "";
    router.push(`/auth?url=${encodeURIComponent(urlParam)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center">
        <Sparkles className="h-10 w-10 text-accent-500 mr-2" />
        <span className="text-3xl font-semibold text-mono-900">Mint</span>
      </div>

      {/* Verification Card */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="text-center">
            {status === "verifying" && (
              <>
                <Loader2 className="h-16 w-16 text-accent-500 mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold text-mono-900 mb-2">
                  Verifying your link
                </h1>
                <p className="text-mono-600">
                  Please wait while we verify your magic link...
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-mono-900 mb-2">
                  Welcome back!
                </h1>
                <p className="text-mono-600 mb-6">
                  You've been successfully authenticated. Redirecting you to the
                  app...
                </p>
                <Button
                  onClick={handleContinue}
                  className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-white"
                >
                  Continue to App
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-mono-900 mb-2">
                  Verification Failed
                </h1>
                <p className="text-mono-600 mb-6">
                  {error ||
                    "Unable to verify your magic link. It may have expired or already been used."}
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={handleBackToAuth}
                    className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-white"
                  >
                    Request New Link
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
