"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, ArrowRight, Globe, Users, MessageSquare, Plus, Check, X as XIcon, TrendingUp, Sparkles } from "lucide-react";
import { SvgLoader } from "@/components/ui/svg-loader";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { useAnalytics } from "@/hooks/use-analytics";
import { analyzeWebsite, createProject, getUserUrlUsage, generatePrompts, generatePromptsFromKeywords, type CreateFullProjectRequest, type UrlUsageResponse, type GeneratePromptsRequest } from "@/lib/auth-api";
import { extractHostname, isUrl } from "@/utils/url-utils";
import { saveSelectedDomain, saveSelectedProject } from "@/lib/navigation-persistence";
import { getMyOrganization, type Organization } from "@/lib/organization-api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { MarketSelector } from "@/components/onboarding/project-info/MarketSelector";
import type { Market } from "@/app/onboarding/types/form-data";
import { PromptGenerationMethod } from "@/components/project-profile/PromptGenerationMethod";
import { KeywordsInput } from "@/components/project-profile/KeywordsInput";
import { PromptCountSelect } from "@/components/project-profile/PromptCountSelect";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (projectId: string) => void;
  onCreateProject: (data: {
    url: string;
    market: string;
    language: string;
    name: string;
  }) => Promise<{ id: string }>;
}

enum StepId {
  PROJECT = 1,
  BRAND = 2,
  PROMPT_METHOD = 3,
  PROMPTS = 4,
}

interface StepConfig {
  id: StepId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepConfig[] = [
  { id: StepId.PROJECT, name: "Project", icon: Globe },
  { id: StepId.BRAND, name: "Brand", icon: Users },
  { id: StepId.PROMPT_METHOD, name: "Generator", icon: Sparkles },
  { id: StepId.PROMPTS, name: "Prompts", icon: MessageSquare },
];

export default function AddProjectModal({
  isOpen,
  onClose,
  onSuccess,
  onCreateProject,
}: AddProjectModalProps) {
  const { token } = useAuth();
  const router = useRouter();
  const analytics = useAnalytics();
  const [currentStep, setCurrentStep] = useState<StepId>(StepId.PROJECT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // URL usage tracking
  const [urlUsage, setUrlUsage] = useState<UrlUsageResponse | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);

  // Organization data for plan limits
  const [organization, setOrganization] = useState<Organization | null>(null);

  // Step 1: Project Info
  const [website, setWebsite] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [markets, setMarkets] = useState<Market[]>([]);

  // Step 2: Brand Identity
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorError, setCompetitorError] = useState("");
  const [analyzedData, setAnalyzedData] = useState<any>(null);

  // Step 3: Prompt Method
  const [promptGenerationMethod, setPromptGenerationMethod] = useState<'ai' | 'keywords'>('ai');
  const [keywords, setKeywords] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [promptCount, setPromptCount] = useState('12');

  // Step 4: Prompts
  const [visibilityPrompts, setVisibilityPrompts] = useState<{ id: string; text: string; selected: boolean }[]>([]);
  const [perceptionPrompts, setPerceptionPrompts] = useState<string[]>([]);
  const [alignmentPrompts, setAlignmentPrompts] = useState<string[]>([]);
  const [competitionPrompts, setCompetitionPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editableValue, setEditableValue] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Helper to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Helper functions for plan limits
  const getMaxCompetitors = () => {
    // Default limits based on typical plan structure
    if (!organization) return 5; // Default if organization data not loaded

    // maxProjects is used as a proxy for plan level
    // Starter: 1 project = 5 competitors
    // Growth: 5 projects = 10 competitors
    // Pro: 15 projects = 20 competitors
    // Enterprise: unlimited = 50 competitors
    const maxProjects = organization.planSettings.maxProjects;
    if (maxProjects <= 1) return 5;
    if (maxProjects <= 5) return 10;
    if (maxProjects <= 15) return 20;
    return 50;
  };

  const getMaxPrompts = () => {
    // Use maxSpontaneousPrompts from plan settings
    return organization?.planSettings.maxSpontaneousPrompts || 10;
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(StepId.PROJECT);
      setWebsite("");
      setCustomUrl("");
      setShowCustomUrlInput(false);
      setMarkets([]);
      setBrandName("");
      setDescription("");
      setIndustry("");
      setAttributes([]);
      setCompetitors([]);
      setAnalyzedData(null);
      setVisibilityPrompts([]);
      setPerceptionPrompts([]);
      setAlignmentPrompts([]);
      setCompetitionPrompts([]);
      setEditingId(null);
      setEditableValue("");
      setPromptInput("");
      setAdditionalInstructions("");
      setPromptGenerationMethod('ai');
      setKeywords("");
      setCsvFile(null);
      setError("");
    }
  }, [isOpen]);

  // Fetch URL usage and organization data when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !token) return;

      setIsLoadingUsage(true);
      try {
        // Fetch both URL usage and organization data in parallel
        const [usage, org] = await Promise.all([
          getUserUrlUsage(token),
          getMyOrganization(token)
        ]);
        setUrlUsage(usage);
        setOrganization(org);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        toast.error("Failed to load usage information");
      } finally {
        setIsLoadingUsage(false);
      }
    };

    fetchData();
  }, [isOpen, token]);

  const handleUrlSelectionChange = (value: string) => {
    if (value === "add-new") {
      // Check if user can add more URLs
      if (urlUsage && !urlUsage.canAddMore) {
        // Redirect to update plan
        router.push("/update-plan");
        onClose();
        return;
      }
      // Show custom URL input
      setShowCustomUrlInput(true);
      setWebsite("");
    } else {
      // Select existing URL
      setWebsite(value);
      setShowCustomUrlInput(false);
      setCustomUrl("");
    }
  };

  const canNavigateNext = (): boolean => {
    switch (currentStep) {
      case StepId.PROJECT:
        const urlToUse = showCustomUrlInput ? customUrl : website;
        return !!(urlToUse && markets.length > 0);
      case StepId.BRAND:
        return !!(brandName && description && industry && attributes.length > 0);
      case StepId.PROMPT_METHOD:
        if (promptGenerationMethod === 'keywords') {
          return keywords.trim().length > 0;
        }
        return true;
      case StepId.PROMPTS:
        return visibilityPrompts.some(p => p.selected);
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === StepId.PROJECT) {
      const urlToUse = showCustomUrlInput ? customUrl : website;
      if (urlToUse && markets.length > 0) {
        setIsAnalyzing(true);
        setError("");

        try {
          const primaryMarket = markets[0]?.country || "United States";
          const primaryLanguage = markets[0]?.languages?.[0] || "English";

          const identityCard = await analyzeWebsite(
            {
              url: urlToUse,
              market: primaryMarket,
              language: primaryLanguage,
            },
            token!
          );

          // Pre-fill brand data from analysis
          setBrandName(identityCard.brandName || "");
          setDescription(identityCard.shortDescription || "");
          setIndustry(identityCard.industry || "");
          setAttributes(identityCard.keyBrandAttributes || []);
          setCompetitors(identityCard.competitors || []);
          setAnalyzedData(identityCard);

          setIsAnalyzing(false);
          setCurrentStep(StepId.BRAND);
        } catch (error) {
          setIsAnalyzing(false);
          setError(error instanceof Error ? error.message : "Failed to analyze website");
        }
      }
    } else if (currentStep === StepId.BRAND) {
      // Move to prompt method selection
      setCurrentStep(StepId.PROMPT_METHOD);
    } else if (currentStep === StepId.PROMPT_METHOD) {
      // Generate prompts based on selected method
      await generatePromptsForProject();
    } else if (currentStep === StepId.PROMPTS) {
      await handleCreateProject();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const generatePromptsForProject = async () => {
    setIsLoadingPrompts(true);
    setError("");

    try {
      if (promptGenerationMethod === 'keywords') {
        // Generate from keywords
        const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
        const result = await generatePromptsFromKeywords(
          {
            keywords: keywordList,
            promptType: 'visibility',
            additionalInstructions: additionalInstructions.trim() || undefined,
            count: parseInt(promptCount),
            // Pass project context for prompt generation
            brandName: brandName,
            website: showCustomUrlInput ? customUrl : website,
            industry: industry,
            market: markets[0]?.country || "United States",
            language: markets[0]?.languages?.[0] || "English",
            keyBrandAttributes: attributes,
            competitors: competitors,
            shortDescription: analyzedData?.shortDescription || description,
          },
          token!
        );

        // Set visibility prompts with IDs and selected state
        setVisibilityPrompts(result.prompts.map(text => ({
          id: generateId(),
          text,
          selected: true
        })));
        
        // Set other prompt types if they are returned (for project creation)
        if (result.sentiment) {
          setPerceptionPrompts(result.sentiment.map(text => ({
            id: generateId(),
            text,
            selected: true
          })));
        } else {
          setPerceptionPrompts([]);
        }
        
        if (result.alignment) {
          setAlignmentPrompts(result.alignment.map(text => ({
            id: generateId(),
            text,
            selected: true
          })));
        } else {
          setAlignmentPrompts([]);
        }
        
        if (result.competition) {
          setCompetitionPrompts(result.competition.map(text => ({
            id: generateId(),
            text,
            selected: true
          })));
        } else {
          setCompetitionPrompts([]);
        }
      } else {
        // Generate with AI (existing logic)
        const request: GeneratePromptsRequest = {
          brandName: brandName,
          website: showCustomUrlInput ? customUrl : website,
          industry: industry,
          market: markets[0]?.country || 'United States',
          language: markets[0]?.languages?.[0] || 'English',
          keyBrandAttributes: attributes,
          competitors: competitors,
          shortDescription: description,
          fullDescription: analyzedData?.fullDescription || analyzedData?.longDescription || description,
          additionalInstructions: additionalInstructions.trim() || undefined
        };

        const response = await generatePrompts(request, token!);

        // Set visibility prompts with IDs and selected state
        setVisibilityPrompts(response.visibility.map(text => ({
          id: generateId(),
          text,
          selected: true
        })));
        // Store other prompts but don't display them
        setPerceptionPrompts(response.sentiment);
        setAlignmentPrompts(response.alignment);
        setCompetitionPrompts(response.competition);
      }

      setIsLoadingPrompts(false);
      setCurrentStep(StepId.PROMPTS);
    } catch (error) {
      setIsLoadingPrompts(false);
      setError(error instanceof Error ? error.message : "Failed to generate prompts");
    }
  };

  // Handle adding a new prompt
  const handleAddPrompt = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || visibilityPrompts.length >= 12) {
      return;
    }

    // Check if already exists
    const existing = visibilityPrompts.find(item => item.text === trimmed);
    if (existing) {
      // If it exists but is not selected, select it
      if (!existing.selected) {
        setVisibilityPrompts(visibilityPrompts.map(item =>
          item.id === existing.id ? { ...item, selected: true } : item
        ));
      }
      return;
    }

    // Add as new prompt at the end
    setVisibilityPrompts([...visibilityPrompts, {
      id: generateId(),
      text: trimmed,
      selected: true
    }]);
    setPromptInput("");
  };

  // Handle toggling a prompt by ID
  const handleTogglePrompt = (id: string) => {
    setVisibilityPrompts(visibilityPrompts.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  // Handle editing a prompt by ID
  const handleEditPrompt = (id: string, newValue: string) => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    // Check for duplicates (excluding current item)
    const isDuplicate = visibilityPrompts.some(item =>
      item.id !== id && item.text === trimmed
    );

    if (isDuplicate) {
      return;
    }

    // Update the prompt value
    setVisibilityPrompts(visibilityPrompts.map(item =>
      item.id === id ? { ...item, text: trimmed } : item
    ));
  };

  // Handle deleting a prompt
  const handleDeletePrompt = (id: string) => {
    setVisibilityPrompts(visibilityPrompts.filter(item => item.id !== id));
  };

  const handleBack = () => {
    if (currentStep > StepId.PROJECT) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateProject = async () => {
    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const urlToUse = showCustomUrlInput ? customUrl : website;
      const projectRequest: CreateFullProjectRequest = {
        url: urlToUse,
        brandName: brandName,
        description: analyzedData?.fullDescription || analyzedData?.longDescription || description,
        industry: industry,
        market: markets[0]?.country || "United States",
        language: markets[0]?.languages?.[0] || "English",
        keyBrandAttributes: attributes,
        competitors: competitors,
      };

      // Add prompts - include all types even if only visibility is shown
      const selectedVisibilityPrompts = visibilityPrompts.filter(p => p.selected).map(p => p.text);
      if (selectedVisibilityPrompts.length > 0) {
        projectRequest.prompts = {
          visibility: selectedVisibilityPrompts,
          sentiment: perceptionPrompts,
          alignment: alignmentPrompts,
          competition: competitionPrompts,
        };
      }

      // Add additional instructions if AI generation was used
      if (promptGenerationMethod === 'ai' && additionalInstructions.trim()) {
        projectRequest.additionalInstructions = additionalInstructions.trim();
      }

      const result = await createProject(projectRequest, token);

      analytics.trackProjectCreated(result.id, brandName, 'manual');
      toast.success("Project created successfully!");

      // Extract domain from the new project and switch to it
      const newDomain = extractHostname(result.url);
      if (newDomain) {
        saveSelectedDomain(newDomain);
        saveSelectedProject(result.id);
      }

      // Analysis will be triggered automatically by the backend after project creation
      toast.success("Analysis will start automatically for your new project!");

      onSuccess(result.id);
      onClose();
    } catch (err: any) {
      console.error("Failed to create project:", err);

      if (err.response?.data?.code === "PROJECT_LIMIT_EXCEEDED") {
        setError("You've reached your plan's project limit. Please upgrade to add more projects.");
      } else if (err.response?.data?.code === "URL_LIMIT_EXCEEDED") {
        const errorData = err.response.data;
        setError(`You've reached your unique URL limit (${errorData.maxAllowed}). Please upgrade your plan to add more unique URLs.`);
      } else {
        setError(err.message || "Failed to create project. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-t-accent-500 border-r-accent-300 border-b-accent-200 border-l-accent-100 animate-spin"></div>
            <Globe className="h-8 w-8 text-accent-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-xl font-semibold mb-3 text-mono-900">
            Analyzing your website...
          </h2>
          <p className="text-mono-600 text-center max-w-md">
            We are configuring your project project profile and your prompts portfolio.
          </p>
        </div>
      );
    }

    if (isLoadingPrompts) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-t-accent-500 border-r-accent-300 border-b-accent-200 border-l-accent-100 animate-spin"></div>
            <MessageSquare className="h-8 w-8 text-accent-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-xl font-semibold mb-3 text-mono-900">
            Generating prompts...
          </h2>
          <p className="text-mono-600 text-center max-w-md">
            We're creating personalized prompts for your brand monitoring.
          </p>
        </div>
      );
    }

    switch (currentStep) {
      case StepId.PROJECT:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="url">Website URL</Label>
              {isLoadingUsage ? (
                <div className="flex items-center space-x-2 p-3 border rounded-md mt-1">
                  <SvgLoader className="" size="sm" />
                  <span className="text-sm text-gray-600">Loading URLs...</span>
                </div>
              ) : (
                <>
                  <Select
                    value={showCustomUrlInput ? "add-new" : website}
                    onValueChange={handleUrlSelectionChange}
                  >
                    <SelectTrigger id="url" className="mt-1">
                      <SelectValue placeholder="Select an existing URL or add new" />
                    </SelectTrigger>
                    <SelectContent>
                      {urlUsage?.currentUrls.map((url, index) => (
                        <SelectItem key={index} value={url}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{url}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="add-new">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Add new URL</span>
                          {urlUsage && !urlUsage.canAddMore && (
                            <span className="text-xs text-orange-600">(Upgrade required)</span>
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {showCustomUrlInput && (
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      required
                      className="mt-2"
                    />
                  )}
                </>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Select an existing URL or add a new one to monitor
              </p>
            </div>

            <MarketSelector
              markets={markets}
              onMarketsChange={setMarkets}
            />
          </div>
        );

      case StepId.BRAND:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                type="text"
                placeholder="Your brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your brand"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                type="text"
                placeholder="e.g., Technology, Healthcare, Retail"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Brand Attributes</Label>
                <span className="text-sm text-gray-500">
                  {attributes.length} / 5
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {attributes.map((attr, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {attr}
                    <button
                      onClick={() => setAttributes(attributes.filter((_, i) => i !== index))}
                      className="ml-2 hover:text-red-500"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                type="text"
                placeholder={attributes.length >= 5 ? "Maximum attributes reached" : "Add an attribute and press Enter"}
                className="mt-2"
                disabled={attributes.length >= 5}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim() && attributes.length < 5) {
                    e.preventDefault();
                    setAttributes([...attributes, e.currentTarget.value.trim()]);
                    e.currentTarget.value = "";
                  }
                }}
              />
              {attributes.length >= 5 && (
                <p className="text-xs text-orange-600 mt-1">Maximum of 5 attributes allowed</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Competitors</Label>
                <span className="text-sm text-gray-500">
                  {competitors.length} / {getMaxCompetitors()}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {competitors.map((comp, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {comp}
                    <button
                      onClick={() => setCompetitors(competitors.filter((_, i) => i !== index))}
                      className="ml-2 hover:text-red-500"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                type="text"
                placeholder={competitors.length >= getMaxCompetitors() ? "Maximum competitors reached" : "Add a competitor and press Enter"}
                className={`mt-2 ${competitorError ? "border-red-500 focus:border-red-500" : ""}`}
                disabled={competitors.length >= getMaxCompetitors()}
                onChange={(e) => {
                  // Clear error when user types
                  if (competitorError) {
                    setCompetitorError("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim() && competitors.length < getMaxCompetitors()) {
                    e.preventDefault();
                    const competitorName = e.currentTarget.value.trim();
                    
                    // Check if it's a URL
                    if (isUrl(competitorName)) {
                      setCompetitorError("Enter the name of the competitor, not their URL");
                      return;
                    }
                    
                    setCompetitors([...competitors, competitorName]);
                    e.currentTarget.value = "";
                    setCompetitorError("");
                  }
                }}
              />
              {competitorError && (
                <p className="text-xs text-red-500 mt-1">{competitorError}</p>
              )}
              {competitors.length >= getMaxCompetitors() && (
                <p className="text-xs text-orange-600 mt-1">
                  Maximum of {getMaxCompetitors()} competitors allowed for your plan
                </p>
              )}
            </div>
          </div>
        );

      case StepId.PROMPT_METHOD:
        return (
          <div className="space-y-6">
            <PromptGenerationMethod
              value={promptGenerationMethod}
              onChange={setPromptGenerationMethod}
            />

            {/* Prompt Count Selection */}
            <PromptCountSelect
              value={promptCount}
              onChange={setPromptCount}
              promptType="visibility"
              maxSpontaneousPrompts={getMaxPrompts()}
            />

            {promptGenerationMethod === 'keywords' && (
              <KeywordsInput
                keywords={keywords}
                onKeywordsChange={setKeywords}
                csvFile={csvFile}
                onCsvFileChange={setCsvFile}
              />
            )}

            {/* Additional Instructions */}
            <div className="space-y-2">
              <Label htmlFor="additionalInstructions">Additional Instructions (Optional)</Label>
              <Textarea
                id="additionalInstructions"
                placeholder={ "e.g., Focus on a line of products"}
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Provide specific guidance to tailor the prompt generation
              </p>
            </div>
          </div>
        );

      case StepId.PROMPTS:
        const selectedPromptsCount = visibilityPrompts.filter(p => p.selected).length;
        const maxPrompts = getMaxPrompts();

        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-accent-600" />
                <h3 className="text-xl font-semibold">Visibility Prompts</h3>
                <Badge className="bg-accent-100 text-accent-700 ml-2">
                  {selectedPromptsCount}/{visibilityPrompts.length}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                These prompts test if your brand gets visibility in your market
              </p>

              {/* Add prompt input */}
              <div className="mb-4">
                <div className="relative">
                  <Input
                    placeholder={visibilityPrompts.length >= 12 ? "Maximum prompts reached" : "Add a new visibility prompt..."}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPrompt(promptInput);
                      }
                    }}
                    className="pr-10"
                    disabled={visibilityPrompts.length >= 12}
                  />
                  {promptInput && (
                    <button
                      onClick={() => handleAddPrompt(promptInput)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      disabled={visibilityPrompts.length >= 12}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {visibilityPrompts.length >= 12 && (
                  <p className="text-xs text-amber-600 mt-1">
                    You have reached the maximum of 12 prompts. Remove one to add a new one.
                  </p>
                )}
              </div>

              {/* List of prompts */}
              <div className="space-y-3">
                {visibilityPrompts.map((item) => (
                  <div key={item.id} className="group">
                    {editingId === item.id ? (
                      <div className="p-3 rounded-lg border border-accent-300 bg-accent-50">
                        <div className="flex items-center">
                          <Input
                            value={editableValue}
                            onChange={(e) => setEditableValue(e.target.value)}
                            className="flex-1 h-9 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleEditPrompt(item.id, editableValue);
                                setEditingId(null);
                                setEditableValue("");
                              } else if (e.key === "Escape") {
                                setEditingId(null);
                                setEditableValue("");
                              }
                            }}
                          />
                          <div className="flex ml-2 space-x-1">
                            <button
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                              onClick={() => {
                                handleEditPrompt(item.id, editableValue);
                                setEditingId(null);
                                setEditableValue("");
                              }}
                              aria-label="Confirm edit"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                              onClick={() => {
                                setEditingId(null);
                                setEditableValue("");
                              }}
                              aria-label="Cancel edit"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          item.selected
                            ? "border-accent-300 bg-accent-50"
                            : "border-gray-200 hover:border-accent-200"
                        }`}
                      >
                        <span
                          className="text-sm text-mono-800 cursor-pointer hover:text-accent-600 flex-1"
                          onClick={() => {
                            if (item.selected) {
                              setEditingId(item.id);
                              setEditableValue(item.text);
                            } else {
                              handleTogglePrompt(item.id);
                            }
                          }}
                        >
                          {item.text}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Delete button - only show when prompt is not selected */}
                          {!item.selected && (
                            <button
                              onClick={() => handleDeletePrompt(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                              aria-label="Delete prompt"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          )}
                          <div
                            className={`w-5 h-5 rounded-sm border flex items-center justify-center cursor-pointer transition-colors ${
                              item.selected
                                ? "bg-accent-500 border-accent-500 hover:bg-accent-600"
                                : "border-gray-300 hover:border-accent-400"
                            }`}
                            onClick={() => handleTogglePrompt(item.id)}
                          >
                            {item.selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Plan limitation warning */}
              {selectedPromptsCount >= maxPrompts && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      You have reached the maximum of {maxPrompts} prompts for your plan. Remove prompts or upgrade to add more.
                    </p>
                  </div>
                </div>
              )}

              {visibilityPrompts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No prompts generated yet. Please complete the brand information first.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Follow the steps to set up your brand monitoring project
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center ${
                    index < STEPS.length - 1 ? 'flex-1' : ''
                  }`}>
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full
                      ${isActive ? 'bg-accent-500 text-white' :
                        isCompleted ? 'bg-accent-100 text-accent-600' :
                        'bg-gray-200 text-gray-400'}
                    `}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`ml-2 text-sm ${
                      isActive ? 'text-accent-600 font-medium' :
                      isCompleted ? 'text-gray-700' :
                      'text-gray-400'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-24 h-0.5 mx-4 ${
                      isCompleted ? 'bg-accent-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStep()}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-between">
            <div>
              {currentStep > StepId.PROJECT && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting || isAnalyzing}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isAnalyzing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canNavigateNext() || isSubmitting || isAnalyzing || isLoadingPrompts}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <SvgLoader className="" size="sm" />
                    Creating Project...
                  </>
                ) : currentStep === StepId.PROMPTS ? (
                  <>Create Project</>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
