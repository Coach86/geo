"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/providers/auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Info, MessageSquare, LineChart, TrendingUp, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { generatePrompts, type GeneratePromptsRequest } from "@/lib/auth-api"

interface Prompt {
  text: string;
  selected: boolean;
}

interface PromptSelectionProps {
  initialData?: {
    visibilityPrompts: Prompt[];
    perceptionPrompts: Prompt[];
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
      };
    };
  };
  onDataReady?: (data: { 
    visibilityPrompts: Prompt[]; 
    perceptionPrompts: Prompt[] 
  }) => void;
}

export default function PromptSelection({ initialData, onDataReady }: PromptSelectionProps) {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  
  // Local state - no localStorage updates
  const [visibilityPrompts, setVisibilityPrompts] = useState<Prompt[]>(
    initialData?.visibilityPrompts || []
  );
  const [perceptionPrompts, setPerceptionPrompts] = useState<Prompt[]>(
    initialData?.perceptionPrompts || []
  );
  
  // UI state
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null)
  const [editingPromptType, setEditingPromptType] = useState<"visibility" | "perception" | null>(null)
  const [editingPromptValue, setEditingPromptValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [newVisibilityPrompt, setNewVisibilityPrompt] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Notify parent when data changes (for validation purposes)
  useEffect(() => {
    if (onDataReady) {
      onDataReady({ visibilityPrompts, perceptionPrompts });
    }
  }, [visibilityPrompts, perceptionPrompts, onDataReady]);

  // Count selected items for plan impact
  const selectedVisibilityCount = visibilityPrompts.filter((p: any) => p.selected).length
  const selectedPerceptionCount = perceptionPrompts.filter((p: any) => p.selected).length

  // Generate prompts when component loads
  useEffect(() => {
    const generatePromptsForBrand = async () => {
      // Get data from initial props
      const brandName = initialData?.projectData?.brandName;
      const website = initialData?.projectData?.website;
      const industry = initialData?.projectData?.industry;
      
      console.log('generatePromptsForBrand effect triggered', {
        token: !!token,
        authLoading,
        brandName,
        website,
        industry,
        projectData: initialData?.projectData,
        brandData: initialData?.brandData,
      });
      
      if (!token || authLoading || !brandName || !website) {
        console.log('Skipping prompt generation due to missing data:', {
          hasToken: !!token,
          authLoading,
          hasBrandName: !!brandName,
          hasWebsite: !!website
        });
        
        // If just missing auth token, we'll retry when it's available
        if (!token && !authLoading) {
          setIsLoading(false);
        }
        return
      }

      // If we already have prompts, don't regenerate
      if (visibilityPrompts.length > 0 && perceptionPrompts.length > 0) {
        console.log('Using existing prompts');
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
              setVisibilityPrompts(cached.visibilityPrompts);
              setPerceptionPrompts(cached.perceptionPrompts);
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
          shortDescription: initialData?.projectData?.description || '',
          fullDescription: initialData?.brandData?.analyzedData?.fullDescription || 
                          initialData?.projectData?.description || ''
        }

        console.log('Generating prompts with request:', JSON.stringify(request, null, 2))
        
        const response = await generatePrompts(request, token)
        console.log('Generated prompts response:', response)

        // Map backend response to frontend format
        const newVisibilityPrompts = [
          ...response.spontaneous.map(text => ({ text, selected: true })),
        ]

        const newPerceptionPrompts = [
          ...response.direct.map(text => ({ text, selected: true })),
        ]

        // Cache the generated prompts
        const cacheData = {
          visibilityPrompts: newVisibilityPrompts,
          perceptionPrompts: newPerceptionPrompts,
          timestamp: Date.now()
        }
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))

        // Update state with generated prompts
        setVisibilityPrompts(newVisibilityPrompts);
        setPerceptionPrompts(newPerceptionPrompts);
      } catch (err) {
        console.error('Error generating prompts:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate prompts')
      } finally {
        setIsLoading(false)
      }
    }

    generatePromptsForBrand()
  }, [token, authLoading, initialData])

  // Toggle visibility prompt selection
  const toggleVisibilityPrompt = (index: number) => {
    const updatedPrompts = [...visibilityPrompts]
    updatedPrompts[index].selected = !updatedPrompts[index].selected
    setVisibilityPrompts(updatedPrompts);
  }

  // Toggle perception prompt selection
  const togglePerceptionPrompt = (index: number) => {
    const updatedPrompts = [...perceptionPrompts]
    updatedPrompts[index].selected = !updatedPrompts[index].selected
    setPerceptionPrompts(updatedPrompts);
  }

  // Start editing a prompt
  const startEditingPrompt = (type: "visibility" | "perception", index: number) => {
    setEditingPromptType(type)
    setEditingPromptIndex(index)

    if (type === "visibility") {
      setEditingPromptValue(visibilityPrompts[index]?.text || "")
    } else if (type === "perception") {
      setEditingPromptValue(perceptionPrompts[index]?.text || "")
    }
  }

  // Save edited prompt
  const saveEditedPrompt = () => {
    if (editingPromptType === "visibility" && editingPromptIndex !== null) {
      const updatedPrompts = [...visibilityPrompts]
      updatedPrompts[editingPromptIndex].text = editingPromptValue
      setVisibilityPrompts(updatedPrompts);
    } else if (editingPromptType === "perception" && editingPromptIndex !== null) {
      const updatedPrompts = [...perceptionPrompts]
      updatedPrompts[editingPromptIndex].text = editingPromptValue
      setPerceptionPrompts(updatedPrompts);
    }

    setEditingPromptIndex(null)
    setEditingPromptType(null)
    setEditingPromptValue("")
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingPromptIndex(null)
    setEditingPromptType(null)
    setEditingPromptValue("")
  }

  // Add new visibility prompt
  const addVisibilityPrompt = () => {
    if (newVisibilityPrompt.trim() === "") return

    const updatedPrompts = [...visibilityPrompts]
    updatedPrompts.push({
      text: newVisibilityPrompt,
      selected: true,
    })
    setVisibilityPrompts(updatedPrompts);
    setNewVisibilityPrompt("")
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
            : 'Our AI is analyzing your brand profile and generating relevant prompts to test your brand\'s visibility and perception.'
          }
        </p>
        <div className="mt-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse"></div>
            <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse delay-100"></div>
            <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse delay-200"></div>
          </div>
          <p className="text-sm text-mono-500">This may take a few seconds</p>
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Validate your prompt portfolio</h1>
        <p className="text-gray-600 max-w-md mx-auto">Select the prompts that will be used to analyze your brand</p>

      </div>

      <Accordion type="single" collapsible defaultValue="visibility" className="space-y-6">
        {/* Spontaneous Visibility Prompts */}
        <AccordionItem value="visibility" className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 group">
            <div className="flex flex-col items-start">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-accent-600 mr-2" />
                <h2 className="text-lg font-semibold group-hover:text-accent-700 transition-colors">
                  Spontaneous Visibility Prompts
                </h2>
                <Badge className="ml-2 bg-accent-100 text-accent-700">{selectedVisibilityCount}/{visibilityPrompts.length} max</Badge>
              </div>
              <p className="text-sm text-gray-500 text-left">
                These prompts test if your brand gets visibility in your market
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-gray-50">
            <div className="space-y-3">
              {visibilityPrompts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Generating visibility prompts...</p>
                </div>
              ) : (
                visibilityPrompts.map((prompt: any, index: number) => (
                <Card
                  key={index}
                  className={`border ${prompt.selected ? "border-accent-300 bg-white shadow-sm" : "border-gray-200 bg-white"} transition-all hover:shadow-sm`}
                >
                  <CardContent className="p-4">
                    {editingPromptIndex === index && editingPromptType === "visibility" ? (
                      <div className="space-y-2">
                        <Input
                          value={editingPromptValue}
                          onChange={(e) => setEditingPromptValue(e.target.value)}
                          autoFocus
                          className="text-sm input-focus"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEditing} className="text-xs text-gray-500 hover:text-gray-700">
                            Cancel
                          </button>
                          <button onClick={saveEditedPrompt} className="text-xs text-accent-700 font-medium">
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 mr-4 cursor-pointer"
                          onClick={() => startEditingPrompt("visibility", index)}
                        >
                          <p className="text-sm hover:text-accent-700 transition-colors">{prompt.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={prompt.selected}
                            onCheckedChange={() => toggleVisibilityPrompt(index)}
                            className="data-[state=checked]:bg-accent-600"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
              )}
            </div>
            {/* Add new visibility prompt */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  value={newVisibilityPrompt}
                  onChange={(e) => setNewVisibilityPrompt(e.target.value)}
                  placeholder="Add a new visibility prompt..."
                  className="flex-1"
                />
                <Button
                  onClick={addVisibilityPrompt}
                  disabled={newVisibilityPrompt.trim() === ""}
                  className="bg-accent-600 hover:bg-accent-700 text-white"
                >
                  Add
                </Button>
              </div>

              {/* Plan limitation warning */}
              {selectedVisibilityCount >= 15 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
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
                        onClick={() => setShowPricingDialog(true)}
                      >
                        View pricing details
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Direct Perception Prompts */}
        <AccordionItem value="perception" className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 group">
            <div className="flex flex-col items-start">
              <div className="flex items-center">
                <LineChart className="h-5 w-5 text-accent-600 mr-2" />
                <h2 className="text-lg font-semibold group-hover:text-accent-700 transition-colors">
                  Direct Perception Prompts
                </h2>
                <Badge className="ml-2 bg-accent-100 text-accent-700">
                  {selectedPerceptionCount}/{perceptionPrompts.length}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 text-left">
                Used to measure how the AI describes your brand directly
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-gray-50">
            <div className="space-y-3">
              {perceptionPrompts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Generating perception prompts...</p>
                </div>
              ) : (
                perceptionPrompts.map((prompt: any, index: number) => (
                <Card
                  key={index}
                  className={`border ${prompt.selected ? "border-accent-300 bg-white shadow-sm" : "border-gray-200 bg-white"} transition-all hover:shadow-sm`}
                >
                  <CardContent className="p-4">
                    {editingPromptIndex === index && editingPromptType === "perception" ? (
                      <div className="space-y-2">
                        <Input
                          value={editingPromptValue}
                          onChange={(e) => setEditingPromptValue(e.target.value)}
                          autoFocus
                          className="text-sm input-focus"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEditing} className="text-xs text-gray-500 hover:text-gray-700">
                            Cancel
                          </button>
                          <button onClick={saveEditedPrompt} className="text-xs text-accent-700 font-medium">
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 mr-4 cursor-pointer"
                          onClick={() => startEditingPrompt("perception", index)}
                        >
                          <p className="text-sm hover:text-accent-700 transition-colors">
                            {prompt.text.replace("[Brand]", brandName || "Your brand")}
                          </p>
                          <div className="relative group mt-1">
                            <Info className="h-4 w-4 text-gray-400" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                              Used to measure how the AI describes your brand directly
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={prompt.selected}
                            onCheckedChange={() => togglePerceptionPrompt(index)}
                            className="data-[state=checked]:bg-accent-600"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  )
}