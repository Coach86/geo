"use client";

import Link from "next/link";
import { Sparkles, Globe } from "lucide-react";
import { useOnboarding } from "@/providers/onboarding-provider";
import { Badge } from "@/components/ui/badge";

export default function OnboardingHeader() {
  const { formData } = useOnboarding();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-mono-50 border-b border-mono-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
           <img src={'/logo-small.png'} style={{height: 30}} alt="logo"/>
          </Link>

          <div className="flex items-center gap-3">
            {formData.website && (
              <div className="flex items-center bg-secondary-50 px-3 py-1 rounded-full border border-secondary-200">
                <Globe className="h-4 w-4 text-secondary-500 mr-1.5" />
                <span className="text-sm font-medium text-secondary-700 mr-1">
                  Editing:
                </span>
                <Badge
                  variant="secondary"
                  className="bg-secondary-200 text-secondary-900 border border-secondary-300"
                >
                  {formData.website}
                </Badge>
              </div>
            )}
            <div className="text-sm text-mono-600">
              AI Brand Perception Analysis
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
