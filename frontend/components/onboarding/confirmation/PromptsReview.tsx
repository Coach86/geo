import { Eye, LineChart, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DisplayedConfig, SelectedItems } from "./types";

interface PromptsReviewProps {
  config: DisplayedConfig;
  selectedItems: SelectedItems;
}

export function PromptsReview({ config, selectedItems }: PromptsReviewProps) {
  const {
    selectedVisibilityPrompts,
    selectedPerceptionPrompts,
    selectedCompetitors,
  } = selectedItems;

  return (
    <div className="space-y-6">
      {/* Visibility Prompts */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <Eye className="h-4 w-4 mr-2 text-secondary-600" />
          Visibility Prompts
          <Badge className="ml-2 bg-secondary-100 text-secondary-700">
            {selectedVisibilityPrompts.length}
          </Badge>
        </h3>
        {selectedVisibilityPrompts.length > 0 ? (
          <ul className="space-y-2 pl-6">
            {selectedVisibilityPrompts.map((prompt, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-secondary-400 mr-2">•</span>
                <span>{prompt.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic pl-6">
            No visibility prompts selected
          </p>
        )}
      </div>

      {/* Perception Prompts */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <LineChart className="h-4 w-4 mr-2 text-secondary-600" />
          Perception Prompts
          <Badge className="ml-2 bg-secondary-100 text-secondary-700">
            {selectedPerceptionPrompts.length}
          </Badge>
        </h3>
        {selectedPerceptionPrompts.length > 0 ? (
          <ul className="space-y-2 pl-6">
            {selectedPerceptionPrompts.map((prompt, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-secondary-400 mr-2">•</span>
                <span>
                  {prompt.text.replace(
                    "[Brand]",
                    config.brandName || "Your brand"
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic pl-6">
            No perception prompts selected
          </p>
        )}
      </div>

      {/* Comparison Prompts */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <Users className="h-4 w-4 mr-2 text-accent-600" />
          Comparison Prompts
          <Badge className="ml-2 bg-accent-100 text-accent-700">
            {selectedCompetitors.length}
          </Badge>
        </h3>
        {selectedCompetitors.length > 0 ? (
          <ul className="space-y-2 pl-6">
            {selectedCompetitors.map((competitor, index) => (
              <li key={index} className="text-sm flex items-start">
                <span className="text-accent-400 mr-2">•</span>
                <span>{`${config.brandName || "Your brand"} vs ${
                  competitor.name
                } — which is better?`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic pl-6">
            No competitors selected for comparison
          </p>
        )}
      </div>
    </div>
  );
}