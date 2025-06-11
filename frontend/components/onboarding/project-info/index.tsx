"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Building } from "lucide-react";
import { WebsiteAnalyzer } from "./WebsiteAnalyzer";
import { MarketSelector } from "./MarketSelector";
import { ProjectInfoFields } from "./ProjectInfoFields";
import { calculatePlanImpact } from "./utils";
import type { ProjectInfoProps, PlanType } from "./types";
import type { Market } from "@/app/onboarding/types/form-data";

interface ProjectInfoComponentProps {
  initialData?: {
    project?: {
      website: string;
      brandName: string;
      description: string;
      industry: string;
    };
    brand?: {
      markets: Market[];
      analyzedData?: {
        keyBrandAttributes: string[];
        competitors: string[];
        fullDescription?: string;
      };
    };
  };
  onDataReady?: (data: {
    project: {
      website: string;
      brandName: string;
      description: string;
      industry: string;
    };
    brand: {
      markets: Market[];
      analyzedData?: {
        keyBrandAttributes: string[];
        competitors: string[];
        fullDescription?: string;
      };
    };
  }) => void;
}

export default function ProjectInfo({ initialData, onDataReady }: ProjectInfoComponentProps) {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Local state - no localStorage updates
  const [website, setWebsite] = useState(initialData?.project?.website || "");
  const [brandName, setBrandName] = useState(initialData?.project?.brandName || "");
  const [description, setDescription] = useState(initialData?.project?.description || "");
  const [industry, setIndustry] = useState(initialData?.project?.industry || "");
  const [markets, setMarkets] = useState<Market[]>(
    initialData?.brand?.markets || [{ country: "United States", languages: ["English"] }]
  );
  const [analyzedData, setAnalyzedData] = useState(initialData?.brand?.analyzedData);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isScraped, setIsScraped] = useState(false);
  const [planImpact, setPlanImpact] = useState<PlanType>("Starter");
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

  // Calculate plan impact whenever markets change
  useEffect(() => {
    if (markets.length > 0) {
      setPlanImpact(calculatePlanImpact(markets));
    }
  }, [markets]);

  // Notify parent when data changes (for validation purposes)
  useEffect(() => {
    if (onDataReady) {
      onDataReady({
        project: {
          website,
          brandName,
          description,
          industry,
        },
        brand: {
          markets,
          analyzedData,
        },
      });
    }
  }, [website, brandName, description, industry, markets, analyzedData, onDataReady]);

  const handleAnalysisComplete = (data?: {
    brandName: string;
    description: string;
    industry: string;
    analyzedData: any;
  }) => {
    setIsScraped(true);
    if (data) {
      setBrandName(data.brandName);
      setDescription(data.description);
      setIndustry(data.industry);
      setAnalyzedData(data.analyzedData);
    }
  };

  const handleMarketsChange = (newMarkets: Market[]) => {
    setMarkets(newMarkets);
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
          website={website}
          onWebsiteChange={setWebsite}
          markets={markets}
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
          brandName={brandName}
          description={description}
          industry={industry}
          onBrandNameChange={setBrandName}
          onDescriptionChange={setDescription}
          onIndustryChange={setIndustry}
        />
      </div>
    </div>
  );
}