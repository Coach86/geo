import { Globe, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormData } from "@/providers/onboarding-provider";

interface WebsiteSelectorProps {
  allConfigs: FormData[];
  currentConfigIndex: number;
  viewingConfig: boolean;
  onAddNewUrl: () => void;
  onSelectConfig: (index: number) => void;
}

export function WebsiteSelector({
  allConfigs,
  currentConfigIndex,
  viewingConfig,
  onAddNewUrl,
  onSelectConfig,
}: WebsiteSelectorProps) {
  if (allConfigs.length === 0) return null;

  return (
    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center">
          <Globe className="h-5 w-5 text-secondary-600 mr-2" />
          <span>Configured Websites</span>
          <Badge className="ml-2 bg-secondary-100 text-secondary-700">
            {allConfigs.length}
          </Badge>
        </h2>
        <Button
          variant="outline"
          className="border-dashed"
          onClick={onAddNewUrl}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add website
        </Button>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-thin scrollbar-thumb-gray-300">
        {allConfigs.map((config, index) => (
          <div
            key={config.id}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-md cursor-pointer transition-all border",
              viewingConfig && currentConfigIndex === index
                ? "bg-accent-100 border-accent-300 shadow-sm"
                : "bg-white border-gray-200 hover:bg-gray-100"
            )}
            onClick={() => onSelectConfig(index)}
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent-600" />
              <span className="font-medium whitespace-nowrap">
                {config.website || "No URL"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}