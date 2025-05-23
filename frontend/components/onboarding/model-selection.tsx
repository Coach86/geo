"use client"
import { useOnboarding } from "@/providers/onboarding-provider"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Bot,
  Info,
  Check,
  ChevronDown,
  Search,
  Filter,
  Clock,
  Users,
  X,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { FeatureComparisonDialog } from "@/components/shared/dialogs/feature-comparison-dialog"

export default function ModelSelection() {
  const { formData, updateFormData } = useOnboarding()
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const viewMode = "compact"
  const router = useRouter()
  const [showPricingDialog, setShowPricingDialog] = useState(false)

  // Toggle model selection
  const toggleModel = (modelId: string) => {
    const updatedModels = [...formData.llmModels]
    const modelIndex = updatedModels.findIndex((model) => model.id === modelId)

    if (modelIndex !== -1 && !updatedModels[modelIndex].comingSoon) {
      updatedModels[modelIndex].selected = !updatedModels[modelIndex].selected
      updateFormData({ llmModels: updatedModels })
    }
  }

  // Clear all selections
  const clearAllSelections = () => {
    const updatedModels = [...formData.llmModels]
    updatedModels.forEach((model) => {
      model.selected = false
    })
    updateFormData({ llmModels: updatedModels })
  }

  // Select all models (excluding coming soon)
  const selectAllModels = () => {
    const updatedModels = [...formData.llmModels]
    updatedModels.forEach((model) => {
      if (!model.comingSoon) {
        model.selected = true
      }
    })
    updateFormData({ llmModels: updatedModels })
  }

  // Format data freshness to remove dashes
  const formatDataFreshness = (dataFreshness) => {
    if (!dataFreshness) return ""
    // Replace any dash followed by a space with just a space
    return dataFreshness.replace(/- /g, "")
  }

  // Filter models based on search query
  const filteredModels = formData.llmModels.filter((model) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      model.name.toLowerCase().includes(query) ||
      model.description.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query)
    )
  })

  // Count selected models (excluding coming soon)
  const selectedModelsCount = formData.llmModels.filter((model) => model.selected && !model.comingSoon).length

  // Determine plan impact based on selected models count
  const getModelPlanImpact = () => {
    if (selectedModelsCount > 10) {
      return { plan: "Agencies", color: "bg-teal-100 text-teal-700" }
    } else if (selectedModelsCount > 5) {
      return { plan: "Growth", color: "bg-accent-100 text-accent-700" }
    }
    return { plan: "Starter", color: "bg-gray-100 text-gray-700" }
  }

  const modelPlanImpact = getModelPlanImpact()

  // Get model logo based on model name
  const getModelLogo = (model) => {
    const modelName = model.name.toLowerCase()
    const provider = model.provider.toLowerCase()

    // OpenAI models (GPT-4o, GPT-3.5)
    if (modelName.includes("gpt")) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.051 6.051 0 0 0 6.0572-6.0568 5.9894 5.9894 0 0 0 3.9921-2.9001 6.0557 6.0557 0 0 0-.7334-7.0967z"
            fill="#202123"
          />
          <path
            d="M10.34 17.6645l.0012-.0012 3.5811-2.0678a.5891.5891 0 0 0 .2888-.5083V8.9188a.589.589 0 0 0-.2912-.5071L10.34 6.3439a.5852.5852 0 0 0-.59 0L6.1689 8.4117a.5868.5868 0 0 0-.2912.5071v6.1684a.589.589 0 0 0 .2912.5083l3.5798 2.069a.5852.5852 0 0 0 .5913 0z"
            fill="#10A37F"
          />
        </svg>
      )
    }

    // Claude models (Anthropic)
    if (modelName.includes("claude")) {
      return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 2c6.627 0 12 5.373 12 12s-5.373 12-12 12S4 22.627 4 16 9.373 4 16 4zm0 3a9 9 0 100 18 9 9 0 000-18zm0 2a7 7 0 110 14 7 7 0 010-14z"
            fill="#5436DA"
          />
        </svg>
      )
    }

    // Gemini model (Google)
    if (modelName.includes("gemini")) {
      return (
        <svg width="20" height="20" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M96 8L16 50V142L96 184L176 142V50L96 8Z" fill="url(#paint0_linear_gemini)" />
          <linearGradient id="paint0_linear_gemini" x1="96" y1="8" x2="96" y2="184" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#A142F5" />
            <stop offset="1" stopColor="#4F56EB" />
          </linearGradient>
        </svg>
      )
    }

    // Perplexity model
    if (modelName.includes("perplexity")) {
      return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="16" fill="#5636CD" />
          <path d="M9 9H23V23H9V9Z" stroke="white" strokeWidth="2" />
          <rect x="13" y="13" width="6" height="6" fill="white" />
        </svg>
      )
    }

    // Mixtral model (Mistral)
    if (modelName.includes("mixtral")) {
      return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#0042DA" />
          <path
            d="M22.7107 10.1568H19.6137L16 16.1059L12.3863 10.1568H9.28932L14.4607 18.6275L9.28932 27.0981H12.3863L16 21.1491L19.6137 27.0981H22.7107L17.5393 18.6275L22.7107 10.1568Z"
            fill="white"
          />
        </svg>
      )
    }

    // LLaMA model (Meta)
    if (modelName.includes("llama")) {
      return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#0068C9" />
          <path
            d="M16.5 6.5C15.837 6.5 15.2011 6.76339 14.7322 7.23223C14.2634 7.70107 14 8.33696 14 9V23C14 23.663 14.2634 24.2989 14.7322 24.7678C15.2011 25.2366 15.837 25.5 16.5 25.5C17.163 25.5 17.7989 25.2366 18.2678 24.7678C18.7366 24.2989 19 23.663 19 23V9C19 8.33696 18.7366 7.70107 18.2678 7.23223C17.7989 6.76339 17.163 6.5 16.5 6.5Z"
            fill="white"
          />
          <path
            d="M23.5 13.5C22.837 13.5 22.2011 13.7634 21.7322 14.2322C21.2634 14.7011 21 15.337 21 16C21 16.663 21.2634 17.2989 21.7322 17.7678C22.2011 18.2366 22.837 18.5 23.5 18.5C24.163 18.5 24.7989 18.2366 25.2678 17.7678C25.7366 17.2989 26 16.663 26 16C26 15.337 25.7366 14.7011 25.2678 14.2322C24.7989 13.7634 24.163 13.5 23.5 13.5Z"
            fill="white"
          />
          <path
            d="M9.5 13.5C8.83696 13.5 8.20107 13.7634 7.73223 14.2322C7.26339 14.7011 7 15.337 7 16C7 16.663 7.26339 17.2989 7.73223 17.7678C8.20107 18.2366 8.83696 18.5 9.5 18.5C10.163 18.5 10.7989 18.2366 11.2678 17.7678C11.7366 17.2989 12 16.663 12 16C12 15.337 11.7366 14.7011 11.2678 14.2322C10.7989 13.7634 10.163 13.5 9.5 13.5Z"
            fill="white"
          />
        </svg>
      )
    }

    // Grok model (xAI)
    if (modelName.includes("grok")) {
      return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#000000" />
          <path d="M16 7L7 16L16 25L25 16L16 7Z" fill="#FF0000" />
        </svg>
      )
    }

    // Yi model (01.AI)
    if (modelName.includes("yi")) {
      return (
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#FFFFFF" />
          <path d="M16 5L5 16L16 27L27 16L16 5Z" stroke="#FF8C00" strokeWidth="2" fill="#FF8C00" />
        </svg>
      )
    }

    // Default icon
    return <Bot className="h-4 w-4 text-accent-600" />
  }

  // Get web access info based on model name
  const getWebAccessInfo = (model) => {
    const modelName = model.name.toLowerCase()

    if (modelName.includes("gpt-4o")) {
      return {
        icon: <Check className="h-4 w-4 mr-1 text-green-600" />,
        text: "Live web search + image understanding",
        shortText: "Web + Vision",
        color: "text-green-600",
        bg: "bg-green-50",
        tooltip: "Can search the web in real-time and understand images",
      }
    }

    if (modelName.includes("claude 3 opus")) {
      return {
        icon: <X className="h-4 w-4 mr-1 text-red-600" />,
        text: "No web access",
        shortText: "No Web",
        color: "text-red-600",
        bg: "bg-red-50",
        tooltip: "Limited to training data only",
      }
    }

    if (modelName.includes("gemini")) {
      return {
        icon: <Check className="h-4 w-4 mr-1 text-green-600" />,
        text: "Live access via Google Search",
        shortText: "Google Search",
        color: "text-green-600",
        bg: "bg-green-50",
        tooltip: "Can access current information through Google Search",
      }
    }

    if (modelName.includes("perplexity")) {
      return {
        icon: <Check className="h-4 w-4 mr-1 text-green-600" />,
        text: "Web access with cited sources",
        shortText: "Web + Sources",
        color: "text-green-600",
        bg: "bg-green-50",
        tooltip: "Can search the web and provide citations for information",
      }
    }

    if (modelName.includes("mixtral")) {
      return {
        icon: <X className="h-4 w-4 mr-1 text-red-600" />,
        text: "No web access",
        shortText: "No Web",
        color: "text-red-600",
        bg: "bg-red-50",
        tooltip: "Limited to training data only",
      }
    }

    if (modelName.includes("llama")) {
      return {
        icon: <AlertTriangle className="h-4 w-4 mr-1 text-amber-600" />,
        text: "Limited web access (via Meta AI only)",
        shortText: "Limited Web",
        color: "text-amber-600",
        bg: "bg-amber-50",
        tooltip: "Can only access web through Meta AI interface",
      }
    }

    if (modelName.includes("grok")) {
      return {
        icon: <AlertTriangle className="h-4 w-4 mr-1 text-amber-600" />,
        text: "Partial web access via X search",
        shortText: "X Search",
        color: "text-amber-600",
        bg: "bg-amber-50",
        tooltip: "Limited web access through X/Twitter search",
      }
    }

    if (modelName.includes("gpt-3.5")) {
      return {
        icon: <X className="h-4 w-4 mr-1 text-red-600" />,
        text: "No web access",
        shortText: "No Web",
        color: "text-red-600",
        bg: "bg-red-50",
        tooltip: "Limited to training data only",
      }
    }

    if (modelName.includes("claude 3 sonnet")) {
      return {
        icon: <X className="h-4 w-4 mr-1 text-red-600" />,
        text: "No web access",
        shortText: "No Web",
        color: "text-red-600",
        bg: "bg-red-50",
        tooltip: "Limited to training data only",
      }
    }

    if (modelName.includes("yi")) {
      return {
        icon: <X className="h-4 w-4 mr-1 text-red-600" />,
        text: "No web access",
        shortText: "No Web",
        color: "text-red-600",
        bg: "bg-red-50",
        tooltip: "Limited to training data only",
      }
    }

    // Default case
    return {
      icon: <X className="h-4 w-4 mr-1 text-red-600" />,
      text: "No web access",
      shortText: "No Web",
      color: "text-red-600",
      bg: "bg-red-50",
      tooltip: "Limited to training data only",
    }
  }

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <Bot className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Select AI models to analyze</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose which AI models will be used to analyze your brand perception
        </p>
        <div className="mt-4 inline-flex items-center px-3 py-1 rounded-md bg-accent-50 text-accent-700 text-sm">
          <Check className="h-4 w-4 mr-1.5" />
          <span className="font-medium">{selectedModelsCount} models selected</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search and actions bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search models..."
                className="pl-9 h-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-2.5 top-2.5"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9" onClick={selectAllModels}>
                    <Check className="h-4 w-4 mr-1.5 text-green-500" />
                    <span className="hidden sm:inline">Select All</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Select all models</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-4 w-4 mr-1.5 text-gray-500" />
                        <span className="hidden sm:inline">Actions</span>
                        <ChevronDown className="h-4 w-4 ml-0 sm:ml-1.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>More actions</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={selectAllModels} className="cursor-pointer">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Select all models
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearAllSelections} className="cursor-pointer text-red-600">
                    <X className="h-4 w-4 mr-2" />
                    Clear all selections
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center">
                <span className="text-xs text-gray-500 mr-1">Plan impact:</span>
                <Badge className={`${modelPlanImpact.color}`}>{modelPlanImpact.plan}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Table View */}
        {viewMode === "compact" && (
          <div className="rounded-lg border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Model</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200 hidden sm:table-cell">
                    Provider
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <span>Knowledge cutoff</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Date until which the model has knowledge</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Web</th>
                  <th className="p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200 w-16">
                    Select
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 mb-2 text-gray-300" />
                        <p>No models match your search</p>
                        <Button variant="link" onClick={() => setSearchQuery("")} className="mt-1">
                          Clear search
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((model, index) => {
                    const webAccessInfo = getWebAccessInfo(model)
                    const formattedDataFreshness = formatDataFreshness(model.dataFreshness)

                    return (
                      <tr
                        key={model.id}
                        className={`
                          ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} 
                          ${model.selected ? "bg-accent-50 border-l-4 border-l-accent-500" : "border-l-4 border-l-transparent"} 
                          ${hoveredRow === model.id && !model.comingSoon ? "bg-gray-100" : ""}
                          ${model.comingSoon ? "opacity-60" : ""}
                          transition-colors duration-100
                        `}
                        onMouseEnter={() => !model.comingSoon && setHoveredRow(model.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="p-3 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-1.5 rounded-md ${model.selected ? "bg-accent-200" : "bg-gray-100"} transition-colors duration-200 flex items-center justify-center w-7 h-7 flex-shrink-0`}
                            >
                              {getModelLogo(model)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm flex items-center gap-1.5 truncate">
                                {model.name}
                                {model.new && !model.comingSoon && (
                                  <Badge className="bg-green-100 text-green-700 px-1 py-0 text-[10px] flex-shrink-0">
                                    New
                                  </Badge>
                                )}
                                {model.comingSoon && (
                                  <Badge className="bg-gray-100 text-gray-700 px-1 py-0 text-[10px] flex-shrink-0">
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200 hidden sm:table-cell">
                          <div className="text-sm font-medium truncate max-w-[120px]">{model.provider}</div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="text-sm flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[100px]">{formattedDataFreshness}</span>
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`text-xs flex items-center px-2 py-1 rounded-full ${webAccessInfo.bg} ${webAccessInfo.color} w-fit whitespace-nowrap`}
                                >
                                  {webAccessInfo.icon}
                                  <span>{webAccessInfo.shortText}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{webAccessInfo.text}</p>
                                <p className="text-xs text-gray-500 mt-1">{webAccessInfo.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="p-3 border-b border-gray-200 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={model.selected}
                              onCheckedChange={() => toggleModel(model.id)}
                              disabled={model.comingSoon}
                              className="data-[state=checked]:bg-accent-600"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed Table View */}
        {viewMode === "detailed" && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Model</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <span>Provider</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Company behind the model</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <span>Audience</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Estimated user reach</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <span>Knowledge cutoff</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Date until which the model has knowledge</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <span>Web Access</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Whether the model can access current web information</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </th>
                  <th className="p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200 w-24">
                    Select
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 mb-2 text-gray-300" />
                        <p>No models match your search</p>
                        <Button variant="link" onClick={() => setSearchQuery("")} className="mt-1">
                          Clear search
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((model, index) => {
                    const webAccessInfo = getWebAccessInfo(model)
                    const formattedDataFreshness = formatDataFreshness(model.dataFreshness)

                    return (
                      <tr
                        key={model.id}
                        className={`
                          ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} 
                          ${model.selected ? "bg-accent-50 border-l-4 border-l-accent-500" : "border-l-4 border-l-transparent"} 
                          ${hoveredRow === model.id && !model.comingSoon ? "bg-gray-100" : ""}
                          ${model.comingSoon ? "opacity-60" : ""}
                          transition-colors duration-100
                        `}
                        onMouseEnter={() => !model.comingSoon && setHoveredRow(model.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td className="p-3 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-1.5 rounded-md ${model.selected ? "bg-accent-200" : "bg-gray-100"} transition-colors duration-200 flex items-center justify-center w-8 h-8`}
                            >
                              {getModelLogo(model)}
                            </div>
                            <div>
                              <div className="font-medium text-sm flex items-center gap-1.5">
                                {model.name}
                                {model.new && !model.comingSoon && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-green-100 text-green-700 px-1 py-0 text-[10px]">New</Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Recently released model</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {model.comingSoon && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="bg-gray-100 text-gray-700 px-1 py-0 text-[10px]">Coming Soon</Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>This model will be available soon</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="text-sm font-medium">{model.provider}</div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="text-sm flex items-center">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            <span>{model.audience}</span>
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="text-sm flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            <span>{formattedDataFreshness}</span>
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`text-xs flex items-center px-2 py-1 rounded-full ${webAccessInfo.bg} ${webAccessInfo.color} w-fit`}
                                >
                                  {webAccessInfo.icon}
                                  <span>{webAccessInfo.text}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{webAccessInfo.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="p-3 border-b border-gray-200 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={model.selected}
                              onCheckedChange={() => toggleModel(model.id)}
                              disabled={model.comingSoon}
                              className="data-[state=checked]:bg-accent-600"
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Explanation text */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-accent-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700">
                We suggest selecting multiple models for a more comprehensive analysis. Different models may have
                different perceptions of your brand, providing you with a more complete picture.
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Models with web access can provide more up-to-date information about your brand and competitors.
                Consider selecting a mix of models with different data freshness and capabilities.
              </p>
              {selectedModelsCount > 5 && (
                <div className="mt-3 p-3 bg-accent-50 border border-accent-200 rounded-md">
                  <p className="text-sm font-medium text-accent-700 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Your selection of {selectedModelsCount} models requires a {modelPlanImpact.plan} plan or higher
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1 text-xs text-accent-700 hover:text-accent-900"
                    onClick={() => setShowPricingDialog(true)}
                  >
                    View pricing details
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <FeatureComparisonDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        recommendedPlan={modelPlanImpact.plan.toLowerCase() as any}
      />
    </div>
  )
}
