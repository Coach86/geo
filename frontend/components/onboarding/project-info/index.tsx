"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Building } from "lucide-react";
import { WebsiteAnalyzer } from "./WebsiteAnalyzer";
import { MarketSelector } from "./MarketSelector";
import { ProjectInfoFields } from "./ProjectInfoFields";
import { calculatePlanImpact } from "./utils";
import { getOnboardingData, updateOnboardingData } from "@/lib/onboarding-storage";
import type { ProjectInfoProps, PlanType } from "./types";

export default function ProjectInfo(props: ProjectInfoProps) {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isScraped, setIsScraped] = useState(false);
  const [planImpact, setPlanImpact] = useState<PlanType>("Starter");
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  
  // Get form data from localStorage
  const formData = getOnboardingData();
  const markets = formData.brand?.markets || [];

  // Calculate plan impact whenever markets change
  useEffect(() => {
    if (markets.length > 0) {
      setPlanImpact(calculatePlanImpact(markets));
    }
  }, [markets]);

  const handleAnalysisComplete = () => {
    setIsScraped(true);
  };

  const handleMarketsChange = (newMarkets: any[]) => {
    updateOnboardingData({
      brand: {
        ...formData.brand,
        markets: newMarkets
      }
    });
  };

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <Building className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">
          Let's identify your brand
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          We'll analyze your website to understand your brand better
        </p>
      </div>

      <div className="space-y-8">
        {/* Website Input and Analyzer */}
        <WebsiteAnalyzer
          token={token}
          isAuthenticated={isAuthenticated}
          authLoading={authLoading}
          onAnalysisComplete={handleAnalysisComplete}
          onError={setAnalysisError}
        />

        {/* Market Selection */}
        <MarketSelector
          markets={markets}
          onMarketsChange={handleMarketsChange}
          planImpact={planImpact}
          onShowPricingDialog={() => setShowPricingDialog(true)}
        />

        {/* Project Info Fields */}
        <ProjectInfoFields
          isLoading={isLoading}
          isScraped={isScraped}
          hasError={analysisError}
        />
      </div>
    </div>
  );
}