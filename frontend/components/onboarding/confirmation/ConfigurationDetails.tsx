import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { ConfigurationSummary } from "./ConfigurationSummary";
import { PromptsReview } from "./PromptsReview";
import { ModelsReview } from "./ModelsReview";
import { ProjectInfoReview } from "./ProjectInfoReview";
import { ConfigurationNavigation } from "./ConfigurationNavigation";
import { TAB_VALUES } from "./constants";
import type { DisplayedConfig, SelectedItems, NavigationHandlers } from "./types";

interface ConfigurationDetailsProps {
  config: DisplayedConfig;
  selectedItems: SelectedItems;
  currentIndex: number;
  totalConfigs: number;
  handlers: NavigationHandlers;
}

export function ConfigurationDetails({
  config,
  selectedItems,
  currentIndex,
  totalConfigs,
  handlers,
}: ConfigurationDetailsProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <Globe className="h-5 w-5 text-accent-600 mr-2" />
          <h2 className="font-semibold text-mono-900">
            {config.website || "Website Configuration"}
          </h2>
          {config.isEditing && (
            <Badge className="ml-2 bg-amber-100 text-amber-800">Editing</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-secondary-600"
          onClick={() => {
            handlers.setEditingMode(true, config.id);
            router.push("/onboarding");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-pencil mr-1"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
          Edit
        </Button>
      </div>

      <Tabs defaultValue={TAB_VALUES.SUMMARY} className="w-full">
        <div className="px-4 pt-4 border-b border-gray-200">
          <TabsList className="grid grid-cols-4 mb-0">
            <TabsTrigger value={TAB_VALUES.SUMMARY}>Summary</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.PROMPTS}>Prompts</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.MODELS}>AI Models</TabsTrigger>
            <TabsTrigger value={TAB_VALUES.BRAND}>Brand Info</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={TAB_VALUES.SUMMARY} className="p-4 focus:outline-none">
          <ConfigurationSummary config={config} selectedItems={selectedItems} />
        </TabsContent>

        <TabsContent value={TAB_VALUES.PROMPTS} className="p-4 focus:outline-none">
          <PromptsReview config={config} selectedItems={selectedItems} />
        </TabsContent>

        <TabsContent value={TAB_VALUES.MODELS} className="p-4 focus:outline-none">
          <ModelsReview
            config={config}
            selectedModels={selectedItems.selectedModels}
            setEditingMode={handlers.setEditingMode}
          />
        </TabsContent>

        <TabsContent value={TAB_VALUES.BRAND} className="p-4 focus:outline-none">
          <ProjectInfoReview config={config} />
        </TabsContent>
      </Tabs>

      <ConfigurationNavigation
        currentIndex={currentIndex}
        totalConfigs={totalConfigs}
        onNavigate={handlers.navigateConfig}
      />
    </div>
  );
}