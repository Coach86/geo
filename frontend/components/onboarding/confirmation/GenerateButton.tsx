import { ArrowRight } from "lucide-react";
import { SvgLoader } from "@/components/ui/svg-loader";
import { Button } from "@/components/ui/button";
import { LoadingStates } from "./LoadingStates";
import type { ConfigStats } from "./types";

interface GenerateButtonProps {
  isGenerating: boolean;
  authLoading: boolean;
  token: string | null;
  stats: ConfigStats;
  onGenerate: () => void;
}

export function GenerateButton({
  isGenerating,
  authLoading,
  token,
  stats,
  onGenerate,
}: GenerateButtonProps) {
  const {
    totalWebsites,
    totalPromptsAllConfigs,
    totalUniqueModels,
    totalUniqueMarkets,
    totalUniqueLanguages,
  } = stats;

  return (
    <div className="mt-8 text-center">
      <Button
        size="lg"
        className="bg-accent-500 hover:bg-accent-600 text-white shadow-button transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onGenerate}
        disabled={isGenerating || authLoading || !token}
      >
        {isGenerating ? (
          <>
            <SvgLoader className="mr-2" size="sm" />
            Generating Report...
          </>
        ) : (
          <>
            Generate my AI Brand Report
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
      <p className="text-xs text-gray-500 mt-2">
        This will analyze {totalWebsites} website
        {totalWebsites > 1 ? "s" : ""} across {totalPromptsAllConfigs} prompts
        using {totalUniqueModels} AI model
        {totalUniqueModels > 1 ? "s" : ""}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Covering {totalUniqueMarkets} market
        {totalUniqueMarkets > 1 ? "s" : ""} and {totalUniqueLanguages} language
        {totalUniqueLanguages > 1 ? "s" : ""}
      </p>
      <LoadingStates isGenerating={isGenerating} />
    </div>
  );
}