// Utility functions for confirmation components
import type { FormData } from "@/providers/onboarding-provider";
import type { ConfigStats, SelectedItems } from "./types";

export const calculateConfigStats = (allConfigs: FormData[]): ConfigStats => {
  const totalWebsites = allConfigs.length;

  // Calculate total prompts across all configurations
  const totalPromptsAllConfigs = allConfigs.reduce((sum, config) => {
    const visibilityCount =
      config.visibilityPrompts?.filter((p) => p.selected).length || 0;
    const perceptionCount =
      config.perceptionPrompts?.filter((p) => p.selected).length || 0;
    const competitorsCount =
      config.competitors?.filter((comp) => comp.selected).length || 0;
    return sum + visibilityCount + perceptionCount + competitorsCount;
  }, 0);

  // Calculate unique AI models across all configurations
  const allSelectedModelIds = new Set<string>();
  allConfigs.forEach((config) => {
    config.llmModels
      ?.filter((model) => model.selected)
      .forEach((model) => {
        allSelectedModelIds.add(model.id);
      });
  });
  const totalUniqueModels = allSelectedModelIds.size;

  // Calculate unique markets and languages
  const allMarkets = new Set<string>();
  const allLanguages = new Set<string>();
  allConfigs.forEach((config) => {
    config.markets?.forEach((market) => {
      allMarkets.add(market.country);
      market.languages?.forEach((lang) => allLanguages.add(lang));
    });
  });

  return {
    totalWebsites,
    totalPromptsAllConfigs,
    totalUniqueModels,
    totalUniqueMarkets: allMarkets.size,
    totalUniqueLanguages: allLanguages.size,
  };
};

export const getSelectedItems = (config: FormData): SelectedItems => {
  const selectedVisibilityPrompts =
    config.visibilityPrompts?.filter((p) => p.selected) || [];
  const selectedPerceptionPrompts =
    config.perceptionPrompts?.filter((p) => p.selected) || [];
  const selectedCompetitors =
    config.competitors?.filter((comp) => comp.selected) || [];
  const selectedModels =
    config.llmModels?.filter((model) => model.selected) || [];

  const totalPrompts =
    selectedVisibilityPrompts.length +
    selectedPerceptionPrompts.length +
    selectedCompetitors.length;

  return {
    selectedVisibilityPrompts,
    selectedPerceptionPrompts,
    selectedCompetitors,
    selectedModels,
    totalPrompts,
  };
};