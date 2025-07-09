"use client";

import { useState, useEffect } from "react";
import { WebsiteAnalyzer } from "./WebsiteAnalyzer";
import { MarketSelector } from "./MarketSelector";
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
  // Local state - no localStorage updates
  const [website, setWebsite] = useState(initialData?.project?.website || "");
  const [markets, setMarkets] = useState<Market[]>(
    initialData?.brand?.markets || []
  );


  // Notify parent when data changes (for validation purposes)
  useEffect(() => {
    if (onDataReady) {
      onDataReady({
        project: {
          website,
          brandName: "",
          description: "",
          industry: "",
        },
        brand: {
          markets,
          analyzedData: undefined,
        },
      });
    }
  }, [website, markets]); // Remove onDataReady from deps to avoid infinite loop


  const handleMarketsChange = (newMarkets: Market[]) => {
    setMarkets(newMarkets);
  };

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-mono-900">
          Launch your first monitoring project
        </h1>
      </div>

      <div className="space-y-8">
        {/* Website Input and Analyzer */}
        <WebsiteAnalyzer
          website={website}
          onWebsiteChange={setWebsite}
        />

        {/* Market Selection - always visible */}
        <MarketSelector
          markets={markets}
          onMarketsChange={handleMarketsChange}
        />

        {/* Project Info Fields - moved to separate step */}
      </div>
    </div>
  );
}
