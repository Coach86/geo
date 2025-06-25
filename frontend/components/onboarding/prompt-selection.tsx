"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/providers/auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Info, MessageSquare, TrendingUp, AlertCircle, Plus, Check, X, PenTool } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { generatePrompts, type GeneratePromptsRequest } from "@/lib/auth-api"

interface PromptItem {
  id: string;
  text: string;
  selected: boolean;
}

interface PromptSelectionProps {
  initialData?: {
    visibilityPrompts: { text: string; selected: boolean }[];
    perceptionPrompts: { text: string; selected: boolean }[];
    projectData?: {
      brandName: string;
      website: string;
      industry: string;
      description?: string;
    };
    brandData?: {
      markets?: Array<{ country: string; languages: string[] }>;
      attributes?: string[];
      competitors?: Array<{ name: string; selected: boolean }>;
      analyzedData?: {
        keyBrandAttributes?: string[];
        competitors?: string[];
        fullDescription?: string;
        scrapedKeywords?: string[];
      };
    };
  };
  onDataReady?: (data: {
    visibilityPrompts: { text: string; selected: boolean }[];
    perceptionPrompts: { text: string; selected: boolean }[];
    alignmentPrompts?: string[];
    competitionPrompts?: string[];
  }) => void;
}

export default function PromptSelection({ initialData, onDataReady }: PromptSelectionProps) {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Helper to generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Initialize prompts with IDs
  const initializePrompts = (prompts: { text: string; selected: boolean }[]): PromptItem[] => {
    return prompts.map(prompt => ({
      id: generateId(),
      ...prompt
    }));
  };

  // Local state - no localStorage updates
  const [visibilityPrompts, setVisibilityPrompts] = useState<PromptItem[]>([]);
  const [perceptionPrompts, setPerceptionPrompts] = useState<PromptItem[]>([]);
  const [alignmentPrompts, setAlignmentPrompts] = useState<string[]>([]);
  const [competitionPrompts, setCompetitionPrompts] = useState<string[]>([]);

  // UI state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editableValue, setEditableValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [promptInput, setPromptInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Notify parent when data changes (for validation purposes)
  useEffect(() => {
    if (onDataReady && visibilityPrompts.length > 0) {
      // Convert back to expected format
      const visibilityPromptsData = visibilityPrompts.map(({ text, selected }) => ({ text, selected }));
      const perceptionPromptsData = perceptionPrompts.map(({ text }) => ({ text, selected: true }));
      onDataReady({
        visibilityPrompts: visibilityPromptsData,
        perceptionPrompts: perceptionPromptsData,
        alignmentPrompts,
        competitionPrompts
      });
    }
  }, [visibilityPrompts, perceptionPrompts, alignmentPrompts, competitionPrompts]); // Remove onDataReady from dependencies

  // Count selected items for plan impact
  const selectedVisibilityCount = visibilityPrompts.filter(p => p.selected).length

  // Generate prompts when component loads
  useEffect(() => {
    const generatePromptsForBrand = async () => {
      // Get data from initial props
      const brandName = initialData?.projectData?.brandName;
      const website = initialData?.projectData?.website;
      const industry = initialData?.projectData?.industry;

      if (!token || authLoading || !brandName || !website) {
        if (!token && !authLoading) {
          setIsLoading(false);
        }
        return
      }

      // If we already have prompts, use them
      if (initialData?.visibilityPrompts && initialData.visibilityPrompts.length > 0) {
        setVisibilityPrompts(initializePrompts(initialData.visibilityPrompts));
        setPerceptionPrompts(initializePrompts(initialData.perceptionPrompts || []));
        setIsLoading(false);
        return;
      }

      // Create a unique cache key based on brand data
      const cacheKey = `prompts-${brandName}-${website}-${industry}`;

      try {
        setIsLoading(true)
        setError(null)

        // Check localStorage cache
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          try {
            const cached = JSON.parse(cachedData)
            // Verify cache is recent (within 24 hours)
            const cacheAge = Date.now() - cached.timestamp
            const maxAge = 24 * 60 * 60 * 1000 // 24 hours

            if (cacheAge < maxAge && cached.visibilityPrompts?.length > 0 && cached.perceptionPrompts?.length > 0) {
              // Use cached prompts
              setVisibilityPrompts(initializePrompts(cached.visibilityPrompts));
              setPerceptionPrompts(initializePrompts(cached.perceptionPrompts));
              setAlignmentPrompts(cached.alignmentPrompts || []);
              setCompetitionPrompts(cached.competitionPrompts || []);
              setIsLoading(false)
              return
            }
          } catch (e) {
            // If cache is corrupted, continue to generate new prompts
            localStorage.removeItem(cacheKey)
          }
        }

        // Build the request from analyzed data or form data
        const keyBrandAttributes = initialData?.brandData?.analyzedData?.keyBrandAttributes ||
                                  initialData?.brandData?.attributes ||
                                  [];

        // Get competitors and ensure they're strings
        const competitorsList = initialData?.brandData?.analyzedData?.competitors ||
                               initialData?.brandData?.competitors ||
                               [];

        // Convert competitor objects to strings if needed
        const competitors = competitorsList.map((c: any) => {
          if (typeof c === 'string') return c;
          if (c.selected && c.name) return c.name;
          if (c.name) return c.name;
          return null;
        }).filter((c: string | null): c is string => c !== null);

        const request: GeneratePromptsRequest = {
          brandName: brandName,
          website: website,
          industry: industry || '',
          market: initialData?.brandData?.markets?.[0]?.country || 'United States',
          language: initialData?.brandData?.markets?.[0]?.languages?.[0] || 'English',
          keyBrandAttributes: keyBrandAttributes,
          competitors: competitors,
          scrapedKeywords: initialData?.brandData?.analyzedData?.scrapedKeywords || [],
          shortDescription: initialData?.projectData?.description || '',
          fullDescription: initialData?.brandData?.analyzedData?.fullDescription ||
                          initialData?.projectData?.description || ''
        }

        const response = await generatePrompts(request, token)

        // Map backend response to frontend format
        const newVisibilityPrompts = response.visibility.map(text => ({ text, selected: true }));
        const newPerceptionPrompts = response.sentiment.map(text => ({ text, selected: true }));

        // Cache ALL generated prompts (including hidden ones)
        const cacheData = {
          visibilityPrompts: newVisibilityPrompts,
          perceptionPrompts: newPerceptionPrompts,
          alignmentPrompts: response.alignment || [],
          competitionPrompts: response.competition || [],
          timestamp: Date.now()
        }
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))

        // Update state with generated prompts
        setVisibilityPrompts(initializePrompts(newVisibilityPrompts));
        setPerceptionPrompts(initializePrompts(newPerceptionPrompts));
        setAlignmentPrompts(response.alignment);
        setCompetitionPrompts(response.competition);
      } catch (err) {
        console.error('Error generating prompts:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate prompts')
      } finally {
        setIsLoading(false)
      }
    }

    generatePromptsForBrand()
  }, [token, authLoading, initialData?.projectData?.brandName, initialData?.projectData?.website, initialData?.projectData?.industry])

  // Handle adding a new prompt
  const handleAddPrompt = (prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed || visibilityPrompts.length >= 12) {
      return
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
  }

  // Handle toggling a prompt by ID
  const handleTogglePrompt = (id: string) => {
    setVisibilityPrompts(visibilityPrompts.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  }

  // Handle editing a prompt by ID
  const handleEditPrompt = (id: string, newValue: string) => {
    const trimmed = newValue.trim()
    if (!trimmed) return

    // Check for duplicates (excluding current item)
    const isDuplicate = visibilityPrompts.some(item =>
      item.id !== id && item.text === trimmed
    )

    if (isDuplicate) {
      return
    }

    // Update the prompt value
    setVisibilityPrompts(visibilityPrompts.map(item =>
      item.id === id ? { ...item, text: trimmed } : item
    ));
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 mb-8 relative">
          <div className="absolute inset-0 rounded-full border-4 border-t-accent-500 border-r-accent-300 border-b-accent-200 border-l-accent-100 animate-spin"></div>
          <MessageSquare className="h-8 w-8 text-accent-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h2 className="text-xl font-semibold mb-3 text-mono-900">
          {authLoading ? 'Checking authentication...' : 'Generating prompts...'}
        </h2>
        <p className="text-mono-600 text-center max-w-md">
          {authLoading
            ? 'Please wait while we verify your authentication.'
            : 'We are automatically building your prompt portfolio to start monitoring based on your project parameters.'
          }
        </p>
        <div className="mt-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse delay-100"></div>
            <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse delay-200"></div>
          </div>
          <p className="text-sm text-mono-500">Thank you for your patience</p>
        </div>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 mb-8 flex items-center justify-center bg-red-100 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold mb-3 text-mono-900">Failed to generate prompts</h2>
        <p className="text-mono-600 text-center max-w-md mb-6">
          {error}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-accent-600 hover:bg-accent-700 text-white"
        >
          Try again
        </Button>
      </div>
    )
  }

  // Show missing brand data state
  const brandName = initialData?.projectData?.brandName;
  const website = initialData?.projectData?.website;

  if (!brandName || !website) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 mb-8 flex items-center justify-center bg-yellow-100 rounded-full">
          <AlertCircle className="h-8 w-8 text-yellow-500" />
        </div>
        <h2 className="text-xl font-semibold mb-3 text-mono-900">Brand information missing</h2>
        <p className="text-mono-600 text-center max-w-md mb-6">
          We need your brand information and website to generate relevant prompts. Please complete the previous steps first.
        </p>
        <Button
          onClick={() => router.push('/onboarding')}
          className="bg-accent-600 hover:bg-accent-700 text-white"
        >
          Go back to setup
        </Button>
      </div>
    )
  }

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Validate your prompt portfolio</h1>
      </div>

      {/* Visibility Prompts */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4">
            <Badge className="bg-accent-100 text-accent-500 hover:bg-accent-200">
              <TrendingUp className="h-3 w-3 mr-1" />
              Visibility Prompts
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Monitor where and how your brand is organically mentioned in AI responses, and how it compares to selected competitors.
            Click on any prompt with the <PenTool className="inline h-3 w-3 text-accent-500 mx-1" /> icon to edit it.
          </p>

          {/* List of prompts */}
          <div className="space-y-3">
            {visibilityPrompts.map((item) => (
              <div key={item.id} className="group">
                {editingId === item.id ? (
                  <div className="p-3 rounded-lg border border-accent-300 bg-accent-50">
                    <div className="flex items-center gap-2">
                      <PenTool className="h-3 w-3 text-accent-500 flex-shrink-0" />
                      <Input
                        value={editableValue}
                        onChange={(e) => setEditableValue(e.target.value)}
                        className="flex-1 h-9 text-sm input-focus"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleEditPrompt(item.id, editableValue)
                            setEditingId(null)
                            setEditableValue("")
                          } else if (e.key === "Escape") {
                            setEditingId(null)
                            setEditableValue("")
                          }
                        }}
                      />
                      <div className="flex ml-2 space-x-1">
                        <button
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                          onClick={() => {
                            handleEditPrompt(item.id, editableValue)
                            setEditingId(null)
                            setEditableValue("")
                          }}
                          aria-label="Confirm edit"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          onClick={() => {
                            setEditingId(null)
                            setEditableValue("")
                          }}
                          aria-label="Cancel edit"
                        >
                          <X className="h-4 w-4" />
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
                      className="text-sm text-mono-800 cursor-pointer hover:text-accent-600 flex-1 flex items-start justify-between gap-2"
                      onClick={() => {
                        if (item.selected) {
                          setEditingId(item.id)
                          setEditableValue(item.text)
                        } else {
                          handleTogglePrompt(item.id)
                        }
                      }}
                    >
                      <span>{item.text}</span>
                      <PenTool className="h-3 w-3 text-accent-500 mt-0.5 flex-shrink-0 mr-2" />
                    </span>
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
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder={visibilityPrompts.length >= 12 ? "Maximum prompts reached" : "Add a new visibility prompt..."}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddPrompt(promptInput)
                  }
                }}
                className="pr-10 input-focus"
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
            <Badge className="bg-accent-100 text-accent-700">{selectedVisibilityCount}/{visibilityPrompts.length}</Badge>
          </div>

          {/* Plan limitation warning */}
          {selectedVisibilityCount >= 15 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-700">
                    {selectedVisibilityCount > 20
                      ? "More than 20 visibility prompts requires Enterprise or Agencies plan"
                      : "More than 15 visibility prompts requires Growth plan or higher"}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs text-amber-700 hover:text-amber-900"
                    onClick={() => router.push('/pricing')}
                  >
                    View pricing details
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6">
            Visibility prompts are used to test if your brand appears naturally in AI responses when users ask about your market or industry.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
