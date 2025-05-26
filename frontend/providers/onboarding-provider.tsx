"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Define the types for our form data
export type FormData = {
  id?: string
  website: string
  brandName: string
  description: string
  industry: string
  markets: {
    country: string
    languages: string[]
  }[]
  attributes: string[]
  competitors: {
    name: string
    logo?: string
    selected: boolean
  }[]
  visibilityPrompts: {
    text: string
    selected: boolean
  }[]
  perceptionPrompts: {
    text: string
    selected: boolean
  }[]
  comparisonPrompts: {
    text: string
    selected: boolean
  }[]
  llmModels: {
    id: string
    name: string
    description: string
    provider: string
    audience: string
    dataFreshness: string
    webAccess: string
    webAccessDetail: string
    icon: string
    recommended: boolean
    new: boolean
    selected: boolean
    comingSoon?: boolean
  }[]
  email: string
  phoneNumber: string
  phoneCountry: string
  country?: string
  language?: string
  isEditing?: boolean
  analyzedData?: {
    keyBrandAttributes: string[]
    competitors: string[]
    fullDescription?: string
  }
}

// Define the context type
type OnboardingContextType = {
  currentStep: number
  setCurrentStep: (step: number) => void
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  updateFormData: (data: Partial<FormData>) => void
  savedConfigs: FormData[]
  addNewConfig: () => void
  setEditingMode: (isEditing: boolean, configId?: string) => void
  canNavigateFromStep: (stepNumber: number) => boolean
}

// Default form data
const defaultFormData: FormData = {
  id: crypto.randomUUID?.() || `id-${Date.now()}`,
  website: "",
  brandName: "",
  description: "",
  industry: "",
  markets: [{ country: "United States", languages: ["English"] }],
  attributes: [],
  competitors: [
    { name: "Competitor 1", selected: true },
    { name: "Competitor 2", selected: true },
    { name: "Competitor 3", selected: false },
    { name: "Competitor 4", selected: false },
  ],
  visibilityPrompts: [
    { text: "Best CRM for startups?", selected: true },
    { text: "Top HR software 2025", selected: true },
    { text: "Most innovative tech companies", selected: true },
    { text: "Best tools for remote teams", selected: true },
    { text: "Leading solutions for customer support", selected: true },
    { text: "Top enterprise software solutions", selected: true },
    { text: "Best marketing automation tools", selected: true },
    { text: "Most reliable cloud services", selected: true },
    { text: "Top project management software", selected: true },
    { text: "Best analytics platforms", selected: true },
    { text: "Leading e-commerce solutions", selected: false },
    { text: "Top collaboration tools", selected: false },
    { text: "Best sales enablement software", selected: false },
    { text: "Leading data visualization tools", selected: false },
    { text: "Top AI-powered business tools", selected: false },
  ],
  perceptionPrompts: [
    { text: "What is [Brand] known for?", selected: true },
    { text: "Is [Brand] reliable?", selected: true },
    { text: "What are [Brand]'s strengths and weaknesses?", selected: true },
    { text: "How innovative is [Brand]?", selected: true },
    { text: "What is [Brand]'s reputation?", selected: true },
  ],
  comparisonPrompts: [],
  llmModels: [
    {
      id: "gpt4o",
      name: "GPT-4o",
      description: "OpenAI's most advanced model, supports reasoning, vision and audio",
      provider: "OpenAI",
      audience: "180M+ (ChatGPT)",
      dataFreshness: "Apr 2024 —",
      webAccess: "full",
      webAccessDetail: "Web + Vision",
      icon: "sparkles",
      recommended: true,
      new: true,
      selected: true,
    },
    {
      id: "claude3opus",
      name: "Claude 3 Opus",
      description: "Anthropic's flagship model, ideal for long-form and nuanced content",
      provider: "Anthropic",
      audience: "10–15M (Slack, Notion)",
      dataFreshness: "Aug 2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "brain",
      recommended: true,
      new: false,
      selected: false,
      comingSoon: true,
    },
    {
      id: "gemini15pro",
      name: "Gemini 1.5 Pro",
      description: "Google's top model, integrated with Android and real-time search",
      provider: "Google DeepMind",
      audience: "100M+ (Search/Android)",
      dataFreshness: "Real-time —",
      webAccess: "full",
      webAccessDetail: "Google Search",
      icon: "sparkles",
      recommended: true,
      new: true,
      selected: false,
      comingSoon: true,
    },
    {
      id: "perplexity",
      name: "Perplexity LLM",
      description: "Fast, search-native LLM with real-time sourcing and citations",
      provider: "Perplexity AI",
      audience: "10M+ MAU",
      dataFreshness: "Real-time —",
      webAccess: "full",
      webAccessDetail: "Web + Sources",
      icon: "zap",
      recommended: false,
      new: true,
      selected: false,
    },
    {
      id: "mixtral",
      name: "Mixtral 8x7B",
      description: "Efficient EU model, fast and open-source with solid technical output",
      provider: "Mistral",
      audience: "Growing fast in EU",
      dataFreshness: "2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "bot",
      recommended: false,
      new: false,
      selected: false,
      comingSoon: true,
    },
    {
      id: "llama3",
      name: "LLaMA 3 70B",
      description: "Meta's latest open model, versatile across technical and general use",
      provider: "Meta",
      audience: "3B+ reach (Meta apps)",
      dataFreshness: "Dec 2023 —",
      webAccess: "partial",
      webAccessDetail: "Partial Web",
      icon: "brain",
      recommended: false,
      new: true,
      selected: false,
      comingSoon: true,
    },
    {
      id: "grok15",
      name: "Grok-1.5",
      description: "xAI's model built for X/Twitter, with bold, web-native tone",
      provider: "xAI (Elon Musk)",
      audience: "Millions (via X)",
      dataFreshness: "2023 —",
      webAccess: "partial",
      webAccessDetail: "Partial Web via X",
      icon: "zap",
      recommended: false,
      new: true,
      selected: false,
      comingSoon: true,
    },
    {
      id: "gpt35turbo",
      name: "GPT-3.5 Turbo",
      description: "OpenAI's freemium model, widely used for daily/general tasks",
      provider: "OpenAI",
      audience: "80–100M (Free users)",
      dataFreshness: "Jan 2022 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "bot",
      recommended: false,
      new: false,
      selected: false,
      comingSoon: true,
    },
    {
      id: "claude3sonnet",
      name: "Claude 3 Sonnet",
      description: "Balanced B2B model used in Slack/Zoom for structured writing",
      provider: "Anthropic",
      audience: "Widely used in B2B apps",
      dataFreshness: "Aug 2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "brain",
      recommended: false,
      new: false,
      selected: false,
    },
    {
      id: "yi34b",
      name: "Yi-34B",
      description: "High-performing open-source Chinese model with multilingual support",
      provider: "01.AI",
      audience: "Strong growth in Asia + OSS",
      dataFreshness: "Mid-2023 —",
      webAccess: "none",
      webAccessDetail: "No Web",
      icon: "bot",
      recommended: false,
      new: true,
      selected: false,
      comingSoon: true,
    },
  ],
  email: "",
  phoneNumber: "",
  phoneCountry: "US",
  isEditing: false,
}

// Create the context with default values
const OnboardingContext = createContext<OnboardingContextType>({
  currentStep: 1,
  setCurrentStep: () => {},
  formData: defaultFormData,
  setFormData: () => {},
  updateFormData: () => {},
  savedConfigs: [],
  addNewConfig: () => {},
  setEditingMode: () => {},
  canNavigateFromStep: () => true,
})

// Create a provider component
export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Initialize state with data from localStorage if available
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    ...defaultFormData,
    id: crypto.randomUUID?.() || `id-${Date.now()}`,
  })
  const [savedConfigs, setSavedConfigs] = useState<FormData[]>([])

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      // Check if this is a new version that requires localStorage reset
      const currentVersion = "v2.0-models-update"
      const savedVersion = localStorage.getItem("onboardingVersion")
      
      if (savedVersion !== currentVersion) {
        // Clear old data and set new version
        localStorage.removeItem("onboardingStep")
        localStorage.removeItem("onboardingData")
        localStorage.removeItem("savedConfigs")
        localStorage.setItem("onboardingVersion", currentVersion)
        console.log("Cleared old onboarding data due to version update")
        return
      }

      const savedStep = localStorage.getItem("onboardingStep")
      const savedData = localStorage.getItem("onboardingData")
      const savedConfigsData = localStorage.getItem("savedConfigs")

      if (savedStep) {
        setCurrentStep(Number.parseInt(savedStep, 10))
      }

      if (savedData) {
        const parsedData = JSON.parse(savedData)
        // Merge with default data to ensure new properties like comingSoon are applied
        const mergedData = {
          ...defaultFormData,
          ...parsedData,
          // Ensure llmModels are properly merged with comingSoon properties
          llmModels: defaultFormData.llmModels.map(defaultModel => {
            const savedModel = parsedData.llmModels?.find((m: any) => m.id === defaultModel.id)
            return {
              ...defaultModel,
              ...savedModel,
              // Force comingSoon from defaults (this is the important part)
              comingSoon: defaultModel.comingSoon
            }
          })
        }
        setFormData(mergedData)
      }

      if (savedConfigsData) {
        const parsedConfigs = JSON.parse(savedConfigsData)
        // Update saved configs to include comingSoon properties
        const updatedConfigs = parsedConfigs.map((config: any) => ({
          ...config,
          llmModels: defaultFormData.llmModels.map(defaultModel => {
            const savedModel = config.llmModels?.find((m: any) => m.id === defaultModel.id)
            return {
              ...defaultModel,
              ...savedModel,
              // Force comingSoon from defaults
              comingSoon: defaultModel.comingSoon
            }
          })
        }))
        setSavedConfigs(updatedConfigs)
      }
    } catch (error) {
      console.error("Error loading onboarding data from localStorage:", error)
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("onboardingStep", currentStep.toString())
      localStorage.setItem("onboardingData", JSON.stringify(formData))
    } catch (error) {
      console.error("Error saving onboarding data to localStorage:", error)
    }
  }, [currentStep, formData])

  // Sauvegarde des configurations uniquement lorsqu'elles changent
  useEffect(() => {
    try {
      localStorage.setItem("savedConfigs", JSON.stringify(savedConfigs))
    } catch (error) {
      console.error("Error saving configurations to localStorage:", error)
    }
  }, [savedConfigs])

  // Helper function to update form data
  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...data }
      return updated
    })
  }

  // Fonction pour ajouter une nouvelle configuration
  const addNewConfig = () => {
    // Sauvegarder la configuration actuelle si elle a un site web
    if (formData.website) {
      // Vérifier si cette configuration existe déjà
      const existingIndex = savedConfigs.findIndex((config) => config.id === formData.id)

      if (existingIndex >= 0) {
        // Mettre à jour la configuration existante
        setSavedConfigs((prev) => {
          const updated = [...prev]
          updated[existingIndex] = formData
          return updated
        })
      } else {
        // Ajouter une nouvelle configuration
        setSavedConfigs((prev) => [...prev, formData])
      }
    }

    // Créer une nouvelle configuration
    setFormData({
      ...defaultFormData,
      id: crypto.randomUUID?.() || `id-${Date.now()}`,
      isEditing: false,
    })
    setCurrentStep(1)
  }

  // Fonction pour définir le mode d'édition
  const setEditingMode = (isEditing: boolean, configId?: string) => {
    if (isEditing && configId) {
      // Trouver la configuration à éditer
      const configToEdit = savedConfigs.find((config) => config.id === configId)
      if (configToEdit) {
        // Sauvegarder la configuration actuelle si elle a un site web et n'est pas déjà sauvegardée
        if (formData.website && !formData.isEditing) {
          const existingIndex = savedConfigs.findIndex((config) => config.id === formData.id)
          if (existingIndex >= 0) {
            // Mettre à jour la configuration existante
            setSavedConfigs((prev) => {
              const updated = [...prev]
              updated[existingIndex] = formData
              return updated
            })
          } else {
            // Ajouter une nouvelle configuration
            setSavedConfigs((prev) => [...prev, formData])
          }
        }

        // Mettre à jour formData avec la configuration à éditer
        setFormData({
          ...configToEdit,
          isEditing: true,
        })
      }
    } else {
      // Mettre à jour le mode d'édition sans changer la configuration
      setFormData((prev) => ({
        ...prev,
        isEditing,
      }))
    }
  }

  // Function to check if navigation from a step is allowed
  const canNavigateFromStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        // For step 1 (Company), user can only navigate if:
        // 1. They have a website AND
        // 2. The website has been analyzed (analyzedData exists) AND
        // 3. At least one market is selected
        return !!(formData.website && formData.analyzedData && formData.markets.length > 0)
      default:
        return true
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        formData,
        setFormData,
        updateFormData,
        savedConfigs,
        addNewConfig,
        setEditingMode,
        canNavigateFromStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

// Create a custom hook to use the context
export function useOnboarding() {
  return useContext(OnboardingContext)
}
