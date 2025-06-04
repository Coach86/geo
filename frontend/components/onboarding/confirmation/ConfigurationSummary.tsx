import { Building, Users, MessageSquare } from "lucide-react";
import type { DisplayedConfig, SelectedItems } from "./types";

interface ConfigurationSummaryProps {
  config: DisplayedConfig;
  selectedItems: SelectedItems;
}

export function ConfigurationSummary({
  config,
  selectedItems,
}: ConfigurationSummaryProps) {
  const { totalPrompts, selectedModels, selectedCompetitors } = selectedItems;

  return (
    <div className="space-y-4">
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Markets</div>
          <div className="text-xl font-semibold">
            {config.markets?.length || 0}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Languages</div>
          <div className="text-xl font-semibold">
            {config.markets?.reduce(
              (sum, market) => sum + (market.languages?.length || 0),
              0
            ) || 0}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Prompts</div>
          <div className="text-xl font-semibold">{totalPrompts}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">AI Models</div>
          <div className="text-xl font-semibold">{selectedModels.length}</div>
        </div>
      </div>

      {/* Key Information */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center">
            <Building className="h-4 w-4 text-accent-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Brand Name</div>
            <div className="font-medium">{config.brandName || "Not provided"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-accent-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Industry</div>
            <div className="font-medium">{config.industry || "Not provided"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-accent-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Competitors</div>
            <div className="font-medium">{selectedCompetitors.length} selected</div>
          </div>
        </div>
      </div>
    </div>
  );
}