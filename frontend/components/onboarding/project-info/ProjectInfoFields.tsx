"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Loader2 } from "lucide-react";
import type { FormData } from "./types";

interface ProjectInfoFieldsProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  isLoading: boolean;
  isScraped: boolean;
  hasError?: boolean;
}

export function ProjectInfoFields({
  formData,
  updateFormData,
  isLoading,
  isScraped,
  hasError,
}: ProjectInfoFieldsProps) {
  if (!isLoading && !isScraped && !hasError) return null;

  return (
    <Card
      className={`border border-gray-200 transition-opacity duration-500 shadow-sm ${
        isLoading ? "opacity-60" : "opacity-100"
      }`}
    >
      <CardContent className="p-6 space-y-4">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
            <div className="w-full max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-secondary-600 animate-spin" />
              </div>
              <div className="h-2 w-full bg-gray-200 overflow-hidden rounded-md">
                <div
                  className="h-full bg-secondary-600 animate-shimmer"
                  style={{ width: "60%" }}
                ></div>
              </div>
              <p className="text-sm text-center text-gray-500 mt-2">
                Analyzing your website...
              </p>
            </div>
          </div>
        )}

        {isScraped && !isLoading && !hasError && (
          <div className="mb-4">
            <Badge className="bg-accent-100 text-accent-500 hover:bg-accent-200">
              <LineChart className="h-3 w-3 mr-1" />
              Brand profile
            </Badge>
          </div>
        )}

        <div>
          <label
            htmlFor="brandName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your brand's name
          </label>
          <Input
            id="brandName"
            placeholder="Brand name"
            className="h-10 input-focus"
            value={formData.brandName}
            onChange={(e) => updateFormData({ brandName: e.target.value })}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Short description
          </label>
          <Textarea
            id="description"
            placeholder="Describe your project in a few sentences"
            className="min-h-[80px] resize-none input-focus"
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
          />
        </div>

        <div>
          <label
            htmlFor="industry"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Your industry/sector
          </label>
          <Input
            id="industry"
            placeholder="HR tech, Fintech, CRM..."
            className="h-10 input-focus"
            value={formData.industry}
            onChange={(e) => updateFormData({ industry: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}