import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Bot } from "lucide-react";
import type { DisplayedConfig } from "./types";

interface ModelsReviewProps {
  config: DisplayedConfig;
  selectedModels: string[];
  setEditingMode: (editing: boolean, configId?: string) => void;
}

export function ModelsReview({ config, selectedModels }: ModelsReviewProps) {
  const models = config.llmModels || [];
  const selectedModelsList = models.filter((model: any) => model.selected);

  if (selectedModelsList.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No AI models have been selected yet. Models will be configured after your plan is activated.
          </AlertDescription>
        </Alert>
        <div className="text-center py-8">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">AI models will be available after setup</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-mono-900">Selected AI Models</h3>
        <Badge variant="secondary">{selectedModelsList.length} models</Badge>
      </div>

      <div className="grid gap-3">
        {selectedModelsList.map((model: any, index: number) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:border-accent-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-accent-600" />
              <div>
                <p className="font-medium text-mono-900">{model.name}</p>
                <p className="text-sm text-gray-600">{model.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {model.webAccess && (
                <Badge variant="outline" className="text-xs">
                  Web Access
                </Badge>
              )}
              {model.new && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  New
                </Badge>
              )}
              {model.recommended && (
                <Badge className="bg-accent-100 text-accent-800 text-xs">
                  Recommended
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4">
        These AI models will be used to analyze your brand's visibility and perception across different platforms.
      </p>
    </div>
  );
}