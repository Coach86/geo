"use client";

import { useState, useEffect } from "react";
import { Building } from "lucide-react";
import { ProjectInfoFields } from "./project-info/ProjectInfoFields";

interface BrandProfileProps {
  initialData?: {
    project?: {
      brandName: string;
      description: string;
      industry: string;
    };
    brand?: {
      analyzedData?: {
        keyBrandAttributes: string[];
        competitors: string[];
        fullDescription?: string;
      };
    };
  };
  onDataReady?: (data: {
    project: {
      brandName: string;
      description: string;
      industry: string;
    };
  }) => void;
}

export default function BrandProfile({ initialData, onDataReady }: BrandProfileProps) {
  const [brandName, setBrandName] = useState(initialData?.project?.brandName || "");
  const [description, setDescription] = useState(initialData?.project?.description || "");
  const [industry, setIndustry] = useState(initialData?.project?.industry || "");
  const [analyzedData] = useState(initialData?.brand?.analyzedData);

  // Notify parent when data changes
  useEffect(() => {
    if (onDataReady) {
      onDataReady({
        project: {
          brandName,
          description,
          industry,
        },
      });
    }
  }, [brandName, description, industry, onDataReady]);

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <Building className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">
          Complete your brand profile
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Review and customize the information we found about your brand
        </p>
      </div>

      <div className="space-y-8">
        <ProjectInfoFields
          isLoading={false}
          isScraped={true}
          hasError={false}
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