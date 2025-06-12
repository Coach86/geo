"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

interface WebsiteAnalyzerProps {
  website: string;
  onWebsiteChange: (website: string) => void;
}

export function WebsiteAnalyzer({
  website,
  onWebsiteChange,
}: WebsiteAnalyzerProps) {

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
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
            />
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>

        </CardContent>
      </Card>

    </>
  );
}