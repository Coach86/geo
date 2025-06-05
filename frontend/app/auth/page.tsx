"use client";

import type React from "react";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink } from "@/lib/auth-api";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url") || "";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMagicLink(email);

      if (response.success) {
        setIsMagicLinkSent(true);
        // Store user ID for potential use later
        localStorage.setItem("pendingUserId", response.userId);
      } else {
        setError(response.message || "Failed to send magic link");
      }
    } catch (error) {
      console.error("Magic link error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to send magic link"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);

    // TODO: Implement Google OAuth integration
    setTimeout(() => {
      setIsLoading(false);
      // Redirect to onboarding with the URL parameter
      router.push(`/onboarding?url=${encodeURIComponent(urlParam)}`);
    }, 1500);
  };

  const handleMagicLinkContinue = () => {
    // This button is now just for show - users should click the link in their email
    // The actual magic link will go to /auth/verify
    alert("Please check your email and click the magic link to continue.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center">
        <img src={'/logo-small.png'} style={{height: 30}} alt="logo"/>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-mono-900 mb-2">
              Welcome to MINT
            </h1>
            <p className="text-mono-600">Create an account to get started.</p>
          </div>

          {!isMagicLinkSent ? (
            <>
              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
                  <p className="font-medium">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="mb-6">
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-mono-700 mb-1"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send magic link"}
                </Button>
              </form>
              {/*
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-mono-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-mono-500">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border border-mono-200 flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              */}
            </>
          ) : (
            <div className="text-center">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
                <p className="font-medium">Magic link sent!</p>
                <p className="text-sm mt-1">
                  Check your email inbox for a link to continue.
                </p>
              </div>
              <p className="text-mono-600 mb-6">
                We've sent a magic link to{" "}
                <span className="font-medium">{email}</span>. Click the link in
                the email to sign in.
              </p>
              <Button
                type="button"
                className="w-full h-12 bg-accent-500 hover:bg-accent-600 text-white"
                onClick={handleMagicLinkContinue}
              >
                I've signed in
              </Button>
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 text-center text-xs text-mono-500">
          <p>
            By continuing, you agree to our{" "}
            <Link href="#" className="text-accent-600 hover:underline">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-accent-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <p className="mt-8 text-mono-500 text-sm">
        © {new Date().getFullYear()} Mint. All rights reserved.
      </p>
    </div>
  );
}
