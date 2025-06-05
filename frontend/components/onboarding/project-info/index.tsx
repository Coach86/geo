"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/providers/onboarding-provider";
import { useAuth } from "@/providers/auth-provider";
import { Building } from "lucide-react";
import { WebsiteAnalyzer } from "./WebsiteAnalyzer";
import { MarketSelector } from "./MarketSelector";
import { ProjectInfoFields } from "./ProjectInfoFields";
import { calculatePlanImpact } from "./utils";
import type { ProjectInfoProps, PlanType } from "./types";

export default function ProjectInfo(props: ProjectInfoProps) {
  const { formData, updateFormData } = useOnboarding();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isScraped, setIsScraped] = useState(false);
  const [planImpact, setPlanImpact] = useState<PlanType>("Starter");
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  // Calculate plan impact whenever markets change
  useEffect(() => {
    setPlanImpact(calculatePlanImpact(formData.markets));
  }, [formData.markets]);

  const handleAnalysisComplete = () => {
    setIsScraped(true);
  };

  const handleMarketsChange = (markets: typeof formData.markets) => {
    updateFormData({ markets });
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
          formData={formData}
          updateFormData={updateFormData}
          token={token}
          isAuthenticated={isAuthenticated}
          authLoading={authLoading}
          onAnalysisComplete={handleAnalysisComplete}
          onError={setAnalysisError}
        />

        {/* Market Selection */}
        <MarketSelector
          markets={formData.markets}
          onMarketsChange={handleMarketsChange}
          planImpact={planImpact}
          onShowPricingDialog={() => setShowPricingDialog(true)}
        />

        {/* Project Info Fields */}
        <ProjectInfoFields
          formData={formData}
          updateFormData={updateFormData}
          isLoading={isLoading}
          isScraped={isScraped}
          hasError={analysisError}
        />
      </div>
    </div>
  );
}