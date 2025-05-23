"use client"

import { useState, useEffect } from "react"
import { useOnboarding } from "@/providers/onboarding-provider"
import { useAuth } from "@/providers/auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Info, Check, MessageSquare, LineChart, TrendingUp, Users, AlertCircle, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { FeatureComparisonDialog } from "@/components/shared/dialogs/feature-comparison-dialog"
import { generatePrompts, type GeneratePromptsRequest } from "@/lib/auth-api"

export default function PromptSelection() {
  const { formData, updateFormData } = useOnboarding()
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null)
  const [editingPromptType, setEditingPromptType] = useState<"visibility" | "perception" | "comparison" | null>(null)
  const [editingPromptValue, setEditingPromptValue] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [newVisibilityPrompt, setNewVisibilityPrompt] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Count selected items for plan impact
  const selectedVisibilityCount = formData.visibilityPrompts?.filter((p) => p.selected).length || 0
  const selectedPerceptionCount = formData.perceptionPrompts?.filter((p) => p.selected).length || 0
  const selectedCompetitorsCount = formData.competitors?.filter((c) => c.selected).length || 0
  const customPromptsCount = formData.customPrompts ? formData.customPrompts.filter((p) => p.selected).length : 0
  const totalPromptsCount = selectedVisibilityCount + selectedPerceptionCount + customPromptsCount

  // Determine plan impact based on selections
  const getPromptPlanImpact = () => {
    if (selectedVisibilityCount > 20 || totalPromptsCount > 100) {
      return { plan: "Agencies", color: "bg-teal-100 text-teal-700" }
    } else if (selectedVisibilityCount > 15 || totalPromptsCount > 50) {
      return { plan: "Growth", color: "bg-accent-100 text-accent-700" }
    }
    return { plan: "Starter", color: "bg-gray-100 text-gray-700" }
  }

  const promptPlanImpact = getPromptPlanImpact()

  // Generate prompts when component loads
  useEffect(() => {
    const generatePromptsForBrand = async () => {
      if (!token || authLoading || !formData.brandName || !formData.website) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Build the request from analyzed data or form data
        const request: GeneratePromptsRequest = {
          brandName: formData.brandName,
          website: formData.website,
          industry: formData.industry,
          market: formData.markets?.[0]?.country || 'United States',
          language: formData.markets?.[0]?.languages?.[0] || 'English',
          keyBrandAttributes: formData.analyzedData?.keyBrandAttributes || formData.attributes,
          competitors: formData.analyzedData?.competitors || formData.competitors?.filter(c => c.selected).map(c => c.name) || [],
          shortDescription: formData.description,
          fullDescription: formData.analyzedData?.fullDescription || formData.description
        }

        const response = await generatePrompts(request, token)
        
        // Map backend response to frontend format
        const visibilityPrompts = [
          ...response.spontaneous.map(text => ({ text, selected: true })),
        ]
        
        const perceptionPrompts = [
          ...response.direct.map(text => ({ text, selected: true })),
        ]
        
        // Update form data with generated prompts
        updateFormData({
          visibilityPrompts,
          perceptionPrompts
        })
      } catch (err) {
        console.error('Error generating prompts:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate prompts')
      } finally {
        setIsLoading(false)
      }
    }

    generatePromptsForBrand()
  }, [token, authLoading, formData.brandName, formData.website])

  // Toggle visibility prompt selection
  const toggleVisibilityPrompt = (index: number) => {
    const updatedPrompts = [...formData.visibilityPrompts]
    updatedPrompts[index].selected = !updatedPrompts[index].selected
    updateFormData({ visibilityPrompts: updatedPrompts })
  }

  // Toggle perception prompt selection
  const togglePerceptionPrompt = (index: number) => {
    const updatedPrompts = [...formData.perceptionPrompts]
    updatedPrompts[index].selected = !updatedPrompts[index].selected
    updateFormData({ perceptionPrompts: updatedPrompts })
  }

  // Start editing a prompt
  const startEditingPrompt = (type: "visibility" | "perception" | "comparison", index: number) => {
    setEditingPromptType(type)
    setEditingPromptIndex(index)

    if (type === "visibility") {
      setEditingPromptValue(formData.visibilityPrompts[index].text)
    } else if (type === "perception") {
      setEditingPromptValue(formData.perceptionPrompts[index].text)
    }
  }

  // Save edited prompt
  const saveEditedPrompt = () => {
    if (editingPromptType === "visibility" && editingPromptIndex !== null) {
      const updatedPrompts = [...formData.visibilityPrompts]
      updatedPrompts[editingPromptIndex].text = editingPromptValue
      updateFormData({ visibilityPrompts: updatedPrompts })
    } else if (editingPromptType === "perception" && editingPromptIndex !== null) {
      const updatedPrompts = [...formData.perceptionPrompts]
      updatedPrompts[editingPromptIndex].text = editingPromptValue
      updateFormData({ perceptionPrompts: updatedPrompts })
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

  // Add custom prompt
  const addCustomPrompt = () => {
    if (customPrompt.trim() === "") return

    // Determine which type of prompt it is based on content
    if (
      customPrompt.toLowerCase().includes("vs") ||
      customPrompt.toLowerCase().includes("versus") ||
      customPrompt.toLowerCase().includes("compare") ||
      customPrompt.toLowerCase().includes("comparison")
    ) {
      // It's likely a comparison prompt
      const updatedPrompts = formData.customPrompts ? [...formData.customPrompts] : []
      updatedPrompts.push({
        text: customPrompt,
        type: "comparison",
        selected: true,
      })
      updateFormData({ customPrompts: updatedPrompts })
    } else if (customPrompt.toLowerCase().includes(formData.brandName?.toLowerCase() || "")) {
      // It contains the brand name, likely a perception prompt
      const updatedPrompts = formData.customPrompts ? [...formData.customPrompts] : []
      updatedPrompts.push({
        text: customPrompt,
        type: "perception",
        selected: true,
      })
      updateFormData({ customPrompts: updatedPrompts })
    } else {
      // Default to visibility prompt
      const updatedPrompts = formData.customPrompts ? [...formData.customPrompts] : []
      updatedPrompts.push({
        text: customPrompt,
        type: "visibility",
        selected: true,
      })
      updateFormData({ customPrompts: updatedPrompts })
    }

    setCustomPrompt("")
  }

  // Generate comparison prompts based on selected competitors
  const selectedCompetitors = formData.competitors.filter((comp) => comp.selected)
  const comparisonPrompts = selectedCompetitors.map(
    (comp) => `${formData.brandName || "Your brand"} vs ${comp.name} — which is better?`,
  )

  // Add new visibility prompt
  const addVisibilityPrompt = () => {
    if (newVisibilityPrompt.trim() === "") return

    const updatedPrompts = [...formData.visibilityPrompts]
    updatedPrompts.push({
      text: newVisibilityPrompt,
      selected: true,
    })
    updateFormData({ visibilityPrompts: updatedPrompts })
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
  if (!formData.brandName || !formData.website) {
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

        {/* Plan impact indicator */}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <div className="inline-flex items-center px-3 py-1 rounded-md bg-accent-50 text-accent-700 text-sm">
            <LineChart className="h-4 w-4 mr-1.5" />
            <span className="font-medium">{totalPromptsCount} prompts selected</span>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-md bg-secondary-50 text-secondary-700 text-sm">
            <Users className="h-4 w-4 mr-1.5" />
            <span className="font-medium">{selectedCompetitorsCount} competitors</span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-md ${promptPlanImpact.color} text-sm`}>
            <span className="font-medium">Plan impact: {promptPlanImpact.plan}</span>
          </div>
        </div>
      </div>

      {/* Plan impact alert */}
      {totalPromptsCount > 30 && (
        <div className="mb-6 p-4 bg-accent-50 border border-accent-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-accent-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-accent-700">
                Your selection requires a {promptPlanImpact.plan} plan or higher
              </p>
              <p className="text-xs text-accent-600 mt-1">
                {totalPromptsCount > 50 &&
                  `Vous avez sélectionné ${totalPromptsCount} prompts (limite du plan Starter : 50). `}
                Cela affectera votre plan tarifaire recommandé.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-2 text-xs text-accent-700 hover:text-accent-900"
                onClick={() => setShowPricingDialog(true)}
              >
                View pricing details
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <Badge className="ml-2 bg-accent-100 text-accent-700">{selectedVisibilityCount}/20 max</Badge>
              </div>
              <p className="text-sm text-gray-500 text-left">
                These prompts test if your brand gets visibility in your market
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-gray-50">
            <div className="space-y-3">
              {formData.visibilityPrompts.map((prompt, index) => (
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
              ))}
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
                  {selectedPerceptionCount}/{formData.perceptionPrompts.length}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 text-left">
                Used to measure how the AI describes your brand directly
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-gray-50">
            <div className="space-y-3">
              {formData.perceptionPrompts.map((prompt, index) => (
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
                            {prompt.text.replace("[Brand]", formData.brandName || "Your brand")}
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
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Competitor Comparison Prompts */}
        <AccordionItem value="comparison" className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 group">
            <div className="flex flex-col items-start">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-accent-600 mr-2" />
                <h2 className="text-lg font-semibold group-hover:text-accent-700 transition-colors">
                  Competitor Comparison Prompts
                </h2>
                <Badge className="ml-2 bg-accent-100 text-accent-700">{selectedCompetitors.length} competitors</Badge>
              </div>
              <p className="text-sm text-gray-500 text-left">Auto-generated from your selected competitors</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 py-4 bg-gray-50">
            <div className="space-y-3">
              {comparisonPrompts.length > 0 ? (
                comparisonPrompts.map((prompt, index) => (
                  <Card key={index} className="border border-accent-200 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">{prompt}</p>
                        <div className="flex items-center justify-center w-6 h-6 bg-accent-500 rounded-md">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-6 bg-white rounded-md border border-gray-200">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 italic">
                    No competitors selected. Please go back and select competitors to generate comparison prompts.
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <FeatureComparisonDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        recommendedPlan={promptPlanImpact.plan.toLowerCase() as any}
      />
    </div>
  )
}
