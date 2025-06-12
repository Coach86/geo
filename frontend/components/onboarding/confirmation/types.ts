// Types for confirmation components
import type { FormData } from "@/providers/onboarding-provider";

export interface DisplayedConfig extends FormData {
  isEditing?: boolean;
}

export interface ExpandedSections {
  visibility: boolean;
  perception: boolean;
  models: boolean;
  urls: boolean;
}

export interface ConfigStats {
  totalWebsites: number;
  totalPromptsAllConfigs: number;
  totalUniqueModels: number;
  totalUniqueMarkets: number;
  totalUniqueLanguages: number;
}

export interface SelectedItems {
  selectedVisibilityPrompts: Array<{ selected: boolean; text: string }>;
  selectedPerceptionPrompts: Array<{ selected: boolean; text: string }>;
  selectedCompetitors: Array<{ selected: boolean; name: string }>;
  selectedModels: Array<{
    selected: boolean;
    id: string;
    name: string;
    description: string;
    provider: string;
    webAccessDetail: string;
    icon: string;
    recommended?: boolean;
  }>;
  totalPrompts: number;
}

export interface NavigationHandlers {
  handleAddNewUrl: () => void;
  viewConfigDetails: (index: number) => void;
  navigateConfig: (direction: "prev" | "next") => void;
  navigateToStep: (step: number) => void;
  setEditingMode: (mode: boolean, id: string) => void;
}

export interface GenerationState {
  isGenerating: boolean;
  generationError: string | null;
}