import { Building, Globe, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DisplayedConfig } from "./types";

interface ProjectInfoReviewProps {
  config: DisplayedConfig;
}

export function ProjectInfoReview({ config }: ProjectInfoReviewProps) {
  return (
    <div className="space-y-6">
      {/* Brand Info */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Building className="h-4 w-4 mr-2 text-mono-900" />
          Project Information
        </h3>
        <div className="pl-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Website</div>
              <div className="font-medium">
                {config.website || "Not provided"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Brand Name</div>
              <div className="font-medium">
                {config.brandName || "Not provided"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Industry</div>
              <div className="font-medium">
                {config.industry || "Not provided"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Markets */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Globe className="h-4 w-4 mr-2 text-mono-900" />
          Markets & Languages
        </h3>
        <div className="pl-6">
          {config.markets && config.markets.length > 0 ? (
            <div className="space-y-3">
              {config.markets.map((market, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-3 rounded-md border border-gray-200"
                >
                  <div className="font-medium">{market.country}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {market.languages?.map((lang, langIndex) => (
                      <Badge
                        key={langIndex}
                        variant="outline"
                        className="bg-white"
                      >
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No markets specified</p>
          )}
        </div>
      </div>

      {/* Brand Attributes */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Users className="h-4 w-4 mr-2 text-secondary-600" />
          Brand Attributes
        </h3>
        <div className="pl-6">
          <div className="flex flex-wrap gap-2">
            {config.attributes && config.attributes.length > 0 ? (
              config.attributes.map((attribute, index) => (
                <Badge
                  variant="outline"
                  key={index}
                  className="px-3 py-1 bg-secondary-50 border-secondary-200 text-secondary-700"
                >
                  {attribute}
                </Badge>
              ))
            ) : (
              <span className="text-gray-500 italic">No attributes selected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}