"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeWebsite } from "@/lib/auth-api";
import type { FormData, IdentityCardResponse } from "./types";

interface WebsiteAnalyzerProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  token: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  onAnalysisComplete: () => void;
  onError?: (hasError: boolean) => void;
}

export function WebsiteAnalyzer({
  formData,
  updateFormData,
  token,
  isAuthenticated,
  authLoading,
  onAnalysisComplete,
  onError,
}: WebsiteAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyzeWebsite = async () => {
    if (!formData.website || !token || hasAnalyzed) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get the primary market and language for analysis
      const primaryMarket = formData.markets[0]?.country || "United States";
      const primaryLanguage = formData.markets[0]?.languages[0] || "English";

      const identityCard: IdentityCardResponse = await analyzeWebsite(
        {
          url: formData.website,
          market: primaryMarket,
          language: primaryLanguage,
        },
        token
      );

      console.log("Identity card response:", identityCard);
      console.log("Key brand attributes:", identityCard.keyBrandAttributes);
      console.log("Competitors:", identityCard.competitors);

      // Update form data with the real identity card data
      updateFormData({
        brandName: identityCard.brandName || "",
        description: identityCard.shortDescription || "",
        industry: identityCard.industry || "",
        analyzedData: {
          keyBrandAttributes: identityCard.keyBrandAttributes || [],
          competitors: identityCard.competitors || [],
          fullDescription:
            identityCard.fullDescription || identityCard.longDescription || "",
        },
      });

      setHasAnalyzed(true);
      onAnalysisComplete();
      onError?.(false);
    } catch (err) {
      console.error("Identity card creation failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to analyze website"
      );
      // Still mark as analyzed and call onAnalysisComplete to show the form
      setHasAnalyzed(true);
      onAnalysisComplete();
      onError?.(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            What is your project website?
          </label>
          <div className="relative mb-4">
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              className="h-12 pl-10 text-base input-focus"
              value={formData.website}
              onChange={(e) => {
                updateFormData({ website: e.target.value });
                setHasAnalyzed(false);
                setError(null);
              }}
              disabled={isLoading}
            />
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>

          {/* Debug info */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              Debug: token={token ? "present" : "missing"}, auth=
              {isAuthenticated ? "yes" : "no"}, loading=
              {authLoading ? "yes" : "no"}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 border border-red-200 bg-red-50 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  Analysis Failed
                </p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-xs text-red-700 hover:text-red-900"
                  onClick={handleAnalyzeWebsite}
                >
                  Try again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button - now requires both website AND market */}
      {formData.website && formData.markets.length > 0 && !hasAnalyzed && (
        <div className="mt-4">
          <Button
            onClick={handleAnalyzeWebsite}
            disabled={isLoading || !token || authLoading}
            className="w-full h-12 text-base font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing your website...
              </>
            ) : authLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Checking authentication...
              </>
            ) : !token ? (
              "Authentication required"
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}