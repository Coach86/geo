"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/providers/onboarding-provider";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Globe,
  Building,
  Users,
  MessageSquare,
  CheckCircle,
  LineChart,
  Bot,
  Plus,
  Eye,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createProject, type CreateFullProjectRequest } from "@/lib/auth-api";

// Ajouter ces imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { FormData } from "@/providers/onboarding-provider";

export default function Confirmation() {
  const {
    formData,
    savedConfigs,
    addNewConfig,
    setFormData,
    setEditingMode,
    setCurrentStep,
  } = useOnboarding();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // État pour suivre la configuration actuellement affichée
  const [currentConfigIndex, setCurrentConfigIndex] = useState<number>(0);
  const [viewingConfig, setViewingConfig] = useState<boolean>(false);

  // État pour gérer les appels d'API
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Garder une copie locale des configurations pour éviter les problèmes lors de la sélection
  const [allConfigs, setAllConfigs] = useState<FormData[]>([]);

  // Mettre à jour la liste des configurations lorsque formData ou savedConfigs changent
  useEffect(() => {
    const configs = [
      formData,
      ...savedConfigs.filter((config) => config.id !== formData.id),
    ].filter((config) => config.website);
    setAllConfigs(configs);
  }, [formData, savedConfigs]);

  // Configuration actuellement affichée
  const displayedConfig =
    viewingConfig && allConfigs.length > currentConfigIndex
      ? allConfigs[currentConfigIndex]
      : formData;

  const [expandedSections, setExpandedSections] = useState<{
    visibility: boolean;
    perception: boolean;
    comparison: boolean;
    models: boolean;
    urls: boolean;
  }>({
    visibility: false,
    perception: false,
    comparison: false,
    models: false,
    urls: true,
  });

  // Count selected prompts for the displayed config
  const selectedVisibilityPrompts =
    displayedConfig.visibilityPrompts?.filter((p) => p.selected) || [];
  const selectedVisibilityCount = selectedVisibilityPrompts.length;

  const selectedPerceptionPrompts =
    displayedConfig.perceptionPrompts?.filter((p) => p.selected) || [];
  const selectedPerceptionCount = selectedPerceptionPrompts.length;

  const selectedCompetitors =
    displayedConfig.competitors?.filter((comp) => comp.selected) || [];
  const selectedModels =
    displayedConfig.llmModels?.filter((model) => model.selected) || [];
  const totalPrompts =
    selectedVisibilityCount +
    selectedPerceptionCount +
    selectedCompetitors.length;

  // Calculer les statistiques globales pour toutes les configurations
  const totalWebsites = allConfigs.length;

  // Calculer le nombre total de prompts à travers toutes les configurations
  const totalPromptsAllConfigs = allConfigs.reduce((sum, config) => {
    const visibilityCount =
      config.visibilityPrompts?.filter((p) => p.selected).length || 0;
    const perceptionCount =
      config.perceptionPrompts?.filter((p) => p.selected).length || 0;
    const competitorsCount =
      config.competitors?.filter((comp) => comp.selected).length || 0;
    return sum + visibilityCount + perceptionCount + competitorsCount;
  }, 0);

  // Calculer le nombre total de modèles d'IA uniques à travers toutes les configurations
  const allSelectedModelIds = new Set();
  allConfigs.forEach((config) => {
    config.llmModels
      ?.filter((model) => model.selected)
      .forEach((model) => {
        allSelectedModelIds.add(model.id);
      });
  });
  const totalUniqueModels = allSelectedModelIds.size;

  // Calculer le nombre total de marchés et langues uniques
  const allMarkets = new Set();
  const allLanguages = new Set();
  allConfigs.forEach((config) => {
    config.markets?.forEach((market) => {
      allMarkets.add(market.country);
      market.languages?.forEach((lang) => allLanguages.add(lang));
    });
  });
  const totalUniqueMarkets = allMarkets.size;
  const totalUniqueLanguages = allLanguages.size;

  // Toggle section expansion
  const toggleSection = (
    section: "visibility" | "perception" | "comparison" | "models" | "urls"
  ) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle generating the AI Brand Report
  const handleGenerateReport = async () => {
    if (!token || authLoading) {
      setGenerationError(
        "Authentication required. Please ensure you are logged in."
      );
      return;
    }

    if (allConfigs.length === 0) {
      setGenerationError(
        "No configurations found. Please add at least one website."
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Process each configuration
      for (const config of allConfigs) {
        console.log("Processing configuration:", config.website);

        // Prepare the identity card request
        const identityCardRequest: CreateFullProjectRequest = {
          url: config.website,
          brandName: config.brandName,
          description:
            config.analyzedData?.fullDescription || config.description,
          industry: config.industry,
          market: config.markets?.[0]?.country || "United States",
          language: config.markets?.[0]?.languages?.[0] || "English",
          keyBrandAttributes:
            config.analyzedData?.keyBrandAttributes || config.attributes || [],
          competitors:
            config.analyzedData?.competitors ||
            config.competitors?.filter((c) => c.selected).map((c) => c.name) ||
            [],
        };

        // Save the identity card (this will also trigger prompt generation automatically)
        console.log("Saving identity card for:", config.brandName);
        const identityCard = await createProject(identityCardRequest, token);
        console.log("Identity card saved successfully:", identityCard.id);
        console.log(
          "Prompt generation will be triggered automatically via backend events"
        );
      }

      console.log("All configurations processed successfully");

      // Redirect to the next step (phone verification)
      setCurrentStep(6);
      router.push("/onboarding");
    } catch (error) {
      console.error("Error generating report:", error);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Failed to generate report. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Gérer l'ajout d'une nouvelle URL
  const handleAddNewUrl = () => {
    addNewConfig();
    router.push("/onboarding");
  };

  // Afficher les détails d'une configuration spécifique
  const viewConfigDetails = (index: number) => {
    setCurrentConfigIndex(index);
    setViewingConfig(true);

    // Ne pas activer automatiquement le mode d'édition ici
    // Cela permet juste de visualiser la configuration
  };

  // Naviguer entre les configurations
  const navigateConfig = (direction: "prev" | "next") => {
    if (direction === "prev" && currentConfigIndex > 0) {
      setCurrentConfigIndex(currentConfigIndex - 1);
    } else if (
      direction === "next" &&
      currentConfigIndex < allConfigs.length - 1
    ) {
      setCurrentConfigIndex(currentConfigIndex + 1);
    }
  };

  // Naviguer vers une étape spécifique pour la configuration sélectionnée
  const navigateToStep = (step: number) => {
    // Mettre à jour formData avec la configuration sélectionnée
    const selectedConfig = allConfigs[currentConfigIndex];
    if (selectedConfig) {
      // Activer le mode d'édition et mettre à jour formData
      setFormData({
        ...selectedConfig,
        isEditing: true,
      });

      // Rediriger vers l'étape appropriée
      switch (step) {
        case 0:
          router.push("/onboarding");
          break;
        case 1:
          router.push("/onboarding/brand-identity");
          break;
        case 2:
          router.push("/onboarding/prompt-selection");
          break;
        case 3:
          // Model selection step removed
          break;
        default:
          router.push("/onboarding");
      }
    }
  };

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">
          Ready to generate your Report?
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Review your selections before we generate your AI brand perception
          report
        </p>
      </div>

      {/* Alert si aucune configuration n'est présente */}
      {allConfigs.length === 0 && (
        <Alert variant="default" className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You haven't configured any websites yet. Please add at least one
            website to generate a report.
          </AlertDescription>
        </Alert>
      )}

      {/* Sélecteur de configuration */}
      {allConfigs.length > 0 && (
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
              onClick={handleAddNewUrl}
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
                onClick={() => viewConfigDetails(index)}
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
      )}

      {/* Interface à onglets pour les détails */}
      {viewingConfig && allConfigs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="h-5 w-5 text-accent-600 mr-2" />
              <h2 className="font-semibold text-mono-900">
                {displayedConfig.website || "Website Configuration"}
              </h2>
              {displayedConfig.isEditing && (
                <Badge className="ml-2 bg-amber-100 text-amber-800">
                  Editing
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-secondary-600"
              onClick={() => {
                setEditingMode(true, displayedConfig.id);
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

          <Tabs defaultValue="summary" className="w-full">
            <div className="px-4 pt-4 border-b border-gray-200">
              <TabsList className="grid grid-cols-4 mb-0">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
                <TabsTrigger value="models">AI Models</TabsTrigger>
                <TabsTrigger value="brand">Brand Info</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="p-4 focus:outline-none">
              <div className="space-y-4">
                {/* Résumé des statistiques */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Markets</div>
                    <div className="text-xl font-semibold">
                      {displayedConfig.markets?.length || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Languages</div>
                    <div className="text-xl font-semibold">
                      {displayedConfig.markets?.reduce(
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
                    <div className="text-xl font-semibold">
                      {selectedModels.length}
                    </div>
                  </div>
                </div>

                {/* Informations clés */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center">
                      <Building className="h-4 w-4 text-accent-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Brand Name</div>
                      <div className="font-medium">
                        {displayedConfig.brandName || "Not provided"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-accent-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Industry</div>
                      <div className="font-medium">
                        {displayedConfig.industry || "Not provided"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-accent-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Competitors</div>
                      <div className="font-medium">
                        {selectedCompetitors.length} selected
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="prompts" className="p-4 focus:outline-none">
              <div className="space-y-6">
                {/* Visibility Prompts */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Eye className="h-4 w-4 mr-2 text-secondary-600" />
                    Visibility Prompts
                    <Badge className="ml-2 bg-secondary-100 text-secondary-700">
                      {selectedVisibilityCount}
                    </Badge>
                  </h3>
                  {selectedVisibilityCount > 0 ? (
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
                      {selectedPerceptionCount}
                    </Badge>
                  </h3>
                  {selectedPerceptionCount > 0 ? (
                    <ul className="space-y-2 pl-6">
                      {selectedPerceptionPrompts.map((prompt, index) => (
                        <li key={index} className="text-sm flex items-start">
                          <span className="text-secondary-400 mr-2">•</span>
                          <span>
                            {prompt.text.replace(
                              "[Brand]",
                              displayedConfig.brandName || "Your brand"
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
                          <span>{`${
                            displayedConfig.brandName || "Your brand"
                          } vs ${competitor.name} — which is better?`}</span>
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
            </TabsContent>

            <TabsContent value="models" className="p-4 focus:outline-none">
              <div className="space-y-4">
                {selectedModels.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedModels.map((model, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-3 rounded-md border border-gray-200"
                      >
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 rounded-md bg-accent-100 flex items-center justify-center mr-3">
                            {model.icon === "sparkles" && (
                              <Check className="h-4 w-4 text-accent-600" />
                            )}
                            {model.icon === "brain" && (
                              <Check className="h-4 w-4 text-accent-600" />
                            )}
                            {model.icon === "zap" && (
                              <Check className="h-4 w-4 text-accent-600" />
                            )}
                            {model.icon === "bot" && (
                              <Check className="h-4 w-4 text-accent-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{model.name}</div>
                            {model.recommended && (
                              <Badge className="bg-accent-100 text-accent-700 text-xs">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {model.description}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Provider:</span>{" "}
                            {model.provider}
                          </div>
                          <div>
                            <span className="text-gray-500">Web Access:</span>{" "}
                            {model.webAccessDetail}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No AI models selected</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setEditingMode(true, displayedConfig.id);
                        router.push("/onboarding");
                      }}
                    >
                      Select AI Models
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="brand" className="p-4 focus:outline-none">
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
                        <div className="text-xs text-gray-500 mb-1">
                          Website
                        </div>
                        <div className="font-medium">
                          {displayedConfig.website || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Brand Name
                        </div>
                        <div className="font-medium">
                          {displayedConfig.brandName || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Industry
                        </div>
                        <div className="font-medium">
                          {displayedConfig.industry || "Not provided"}
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
                    {displayedConfig.markets &&
                    displayedConfig.markets.length > 0 ? (
                      <div className="space-y-3">
                        {displayedConfig.markets.map((market, index) => (
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
                      <p className="text-sm text-gray-500 italic">
                        No markets specified
                      </p>
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
                      {displayedConfig.attributes &&
                      displayedConfig.attributes.length > 0 ? (
                        displayedConfig.attributes.map((attribute, index) => (
                          <Badge
                            variant="outline"
                            key={index}
                            className="px-3 py-1 bg-secondary-50 border-secondary-200 text-secondary-700"
                          >
                            {attribute}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500 italic">
                          No attributes selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Navigation entre les configurations */}
          {allConfigs.length > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateConfig("prev")}
                disabled={currentConfigIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                {currentConfigIndex + 1} of {allConfigs.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateConfig("next")}
                disabled={currentConfigIndex === allConfigs.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bouton pour ajouter une nouvelle URL */}
      <div className="flex justify-center mt-6">
        <Button
          variant="outline"
          className="flex items-center gap-2 border-dashed border-gray-300"
          onClick={handleAddNewUrl}
        >
          <Plus className="h-4 w-4" />
          Add another website to analyze
        </Button>
      </div>

      {/* Error display */}
      {generationError && (
        <div className="mt-6">
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {generationError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {allConfigs.length > 0 && (
        <div className="mt-8 text-center">
          <Button
            size="lg"
            className="bg-accent-500 hover:bg-accent-600 text-white shadow-button transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerateReport}
            disabled={isGenerating || authLoading || !token}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            {totalWebsites > 1 ? "s" : ""} across {totalPromptsAllConfigs}{" "}
            prompts using {totalUniqueModels} AI model
            {totalUniqueModels > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Covering {totalUniqueMarkets} market
            {totalUniqueMarkets > 1 ? "s" : ""} and {totalUniqueLanguages}{" "}
            language
            {totalUniqueLanguages > 1 ? "s" : ""}
          </p>
          {isGenerating && (
            <p className="text-xs text-accent-600 mt-2 font-medium">
              Saving brand configurations and generating prompts...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
