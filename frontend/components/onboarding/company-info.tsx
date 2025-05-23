"use client"

import { useState, useEffect } from "react"
import { useOnboarding } from "@/providers/onboarding-provider"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Globe,
  Building,
  Loader2,
  LineChart,
  Info,
  X,
  Plus,
  AlertCircle,
  MapPin,
  Languages,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { FeatureComparisonDialog } from "@/components/shared/dialogs/feature-comparison-dialog"

// Map of countries to their default languages
const countryToLanguage: Record<string, string[]> = {
  "United States": ["English"],
  "United Kingdom": ["English"],
  Canada: ["English", "Français"],
  Australia: ["English"],
  France: ["Français"],
  Germany: ["Deutsch"],
  Japan: ["日本語"],
  China: ["中文"],
  India: ["English", "हिन्दी"],
  Brazil: ["Português"],
  Mexico: ["Español"],
  Spain: ["Español"],
  Italy: ["Italiano"],
  Netherlands: ["Nederlands"],
  Sweden: ["Svenska"],
  Switzerland: ["Deutsch", "Français", "Italiano"],
  Singapore: ["English", "中文"],
  "South Korea": ["한국어"],
  Russia: ["Русский"],
  "South Africa": ["English"],
}

// Liste des pays avec leurs drapeaux
const countries = [
  { value: "United States", label: "🇺🇸 United States" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "China", label: "🇨🇳 China" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Netherlands", label: "🇳🇱 Netherlands" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "Russia", label: "🇷🇺 Russia" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
]

// Liste des langues avec leurs drapeaux
const languages = [
  { value: "English", label: "🇬🇧 English" },
  { value: "Français", label: "🇫🇷 Français" },
  { value: "Español", label: "🇪🇸 Español" },
  { value: "Deutsch", label: "🇩🇪 Deutsch" },
  { value: "Italiano", label: "🇮🇹 Italiano" },
  { value: "Português", label: "🇵🇹 Português" },
  { value: "Nederlands", label: "🇳🇱 Netherlands" },
  { value: "Svenska", label: "🇸🇪 Svenska" },
  { value: "日本語", label: "🇯🇵 日本語" },
  { value: "中文", label: "🇨🇳 China" },
  { value: "한국어", label: "🇰🇷 한국어" },
  { value: "Русский", label: "🇷🇺 Russia" },
  { value: "العربية", label: "🇸🇦 العربية" },
  { value: "हिन्दी", label: "🇮🇳 हिन्दी" },
]

export default function CompanyInfo() {
  const router = useRouter()
  const { formData, updateFormData } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)
  const [isScraped, setIsScraped] = useState(false)
  const [showCountrySelector, setShowCountrySelector] = useState(false)
  const [selectedCountryForLanguages, setSelectedCountryForLanguages] = useState<string | null>(null)
  const [planImpact, setPlanImpact] = useState<string>("Starter")
  const [showPricingDialog, setShowPricingDialog] = useState(false)

  // Fonction pour ajouter un nouveau marché
  const addMarket = (country: string) => {
    // Vérifier si le marché existe déjà
    if (formData.markets.some((market) => market.country === country)) {
      return
    }

    // Ajouter le marché avec ses langues par défaut
    const defaultLanguages = countryToLanguage[country] || ["English"]
    const newMarkets = [...formData.markets, { country, languages: defaultLanguages }]
    updateFormData({ markets: newMarkets })
    setShowCountrySelector(false)
  }

  // Fonction pour supprimer un marché
  const removeMarket = (country: string) => {
    const newMarkets = formData.markets.filter((market) => market.country !== country)
    updateFormData({ markets: newMarkets })
  }

  // Fonction pour ajouter une langue à un marché
  const addLanguageToMarket = (country: string, language: string) => {
    const newMarkets = formData.markets.map((market) => {
      if (market.country === country) {
        // Vérifier si la langue existe déjà
        if (!market.languages.includes(language)) {
          return { ...market, languages: [...market.languages, language] }
        }
      }
      return market
    })
    updateFormData({ markets: newMarkets })
  }

  // Fonction pour supprimer une langue d'un marché
  const removeLanguageFromMarket = (country: string, language: string) => {
    const newMarkets = formData.markets.map((market) => {
      if (market.country === country) {
        // Ne pas supprimer la dernière langue
        if (market.languages.length > 1) {
          return { ...market, languages: market.languages.filter((lang) => lang !== language) }
        }
      }
      return market
    })
    updateFormData({ markets: newMarkets })
  }

  // Fonction pour déterminer le plan recommandé en fonction du nombre de marchés et langues
  useEffect(() => {
    const totalMarkets = formData.markets.length
    const totalLanguages = formData.markets.reduce((sum, market) => sum + market.languages.length, 0)

    if (totalMarkets <= 1 && totalLanguages <= 1) {
      setPlanImpact("Starter")
    } else if (totalMarkets <= 3 && totalLanguages <= 5) {
      setPlanImpact("Growth")
    } else if (totalMarkets <= 5 && totalLanguages <= 10) {
      setPlanImpact("Pro")
    } else {
      setPlanImpact("Enterprise")
    }
  }, [formData.markets])

  // Simuler le scraping du site web
  useEffect(() => {
    // Only run this effect if we have a website URL and haven't scraped yet
    if (formData.website && !isScraped) {
      // Set loading state
      setIsLoading(true)

      // Simulate API call delay with a fixed timeout
      const timer = setTimeout(() => {
        // Mock data that would be returned from scraping
        const scrapedData = {
          brandName: formData.website.includes("example.com")
            ? "Example Company"
            : formData.website
                .replace(/https?:\/\/(www\.)?/, "")
                .split(".")[0]
                .charAt(0)
                .toUpperCase() +
              formData.website
                .replace(/https?:\/\/(www\.)?/, "")
                .split(".")[0]
                .slice(1),
          description:
            "A leading provider of innovative solutions for businesses looking to optimize their operations and drive growth in the digital age.",
          industry: "Technology",
        }

        // Update form data with scraped data
        updateFormData(scrapedData)

        // Update states to indicate scraping is complete
        setIsLoading(false)
        setIsScraped(true)
      }, 1500)

      // Clean up the timer if the component unmounts
      return () => clearTimeout(timer)
    }
  }, [formData.website, isScraped, updateFormData])

  // Obtenir le label d'un pays à partir de sa valeur
  const getCountryLabel = (countryValue: string) => {
    const country = countries.find((c) => c.value === countryValue)
    return country ? country.label : countryValue
  }

  // Obtenir le label d'une langue à partir de sa valeur
  const getLanguageLabel = (languageValue: string) => {
    const language = languages.find((l) => l.value === languageValue)
    return language ? language.label : languageValue
  }

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <Building className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Let's identify your brand</h1>
        <p className="text-gray-600 max-w-md mx-auto">We'll analyze your website to understand your brand better</p>
      </div>

      <div className="space-y-8">
        {/* Website Input */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              What is your company website?
            </label>
            <div className="relative">
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                className="h-12 pl-10 text-base input-focus"
                value={formData.website}
                onChange={(e) => updateFormData({ website: e.target.value })}
              />
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {/* Company Info Card - Shows after "scraping" */}
        {(isLoading || isScraped) && (
          <Card
            className={`border border-gray-200 transition-opacity duration-500 shadow-sm ${isLoading ? "opacity-60" : "opacity-100"}`}
          >
            <CardContent className="p-6 space-y-4">
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
                  <div className="w-full max-w-md mx-auto">
                    <div className="flex items-center justify-center mb-4">
                      <Loader2 className="h-8 w-8 text-secondary-600 animate-spin" />
                    </div>
                    <div className="h-2 w-full bg-gray-200 overflow-hidden rounded-md">
                      <div className="h-full bg-secondary-600 animate-shimmer" style={{ width: "60%" }}></div>
                    </div>
                    <p className="text-sm text-center text-gray-500 mt-2">Analyzing your website...</p>
                  </div>
                </div>
              )}

              {isScraped && !isLoading && (
                <div className="mb-4">
                  <Badge className="bg-accent-100 text-accent-500 hover:bg-accent-200">
                    <LineChart className="h-3 w-3 mr-1" />
                    Brand profile
                  </Badge>
                </div>
              )}

              <div>
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-1">
                  Your brand's name
                </label>
                <Input
                  id="brandName"
                  placeholder="Brand name"
                  className="h-10 input-focus"
                  value={formData.brandName}
                  onChange={(e) => updateFormData({ brandName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Short description
                </label>
                <Textarea
                  id="description"
                  placeholder="Describe your company in a few sentences"
                  className="min-h-[80px] resize-none input-focus"
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                  Your industry/sector
                </label>
                <Input
                  id="industry"
                  placeholder="HR tech, Fintech, CRM..."
                  className="h-10 input-focus"
                  value={formData.industry}
                  onChange={(e) => updateFormData({ industry: e.target.value })}
                />
              </div>

              {/* Sélection des marchés et langues */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">Markets & Languages</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center text-xs">
                          <span className="mr-1">Plan impact:</span>
                          <Badge
                            className={`
                            ${planImpact === "Starter" ? "bg-gray-100 text-gray-700" : ""}
                            ${planImpact === "Growth" ? "bg-accent-100 text-accent-700" : ""}
                            ${planImpact === "Pro" ? "bg-secondary-100 text-secondary-700" : ""}
                            ${planImpact === "Enterprise" ? "bg-purple-100 text-purple-700" : ""}
                          `}
                          >
                            {planImpact}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[300px]">
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Your selection impacts pricing:</p>
                          <ul className="text-xs space-y-1 list-disc pl-4">
                            <li>
                              <span className="font-medium">Starter:</span> 1 market, 1 language
                            </li>
                            <li>
                              <span className="font-medium">Growth:</span> Up to 3 markets, 5 languages
                            </li>
                            <li>
                              <span className="font-medium">Pro:</span> Up to 5 markets, 10 languages
                            </li>
                            <li>
                              <span className="font-medium">Enterprise:</span> Unlimited
                            </li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Affichage des marchés et langues sélectionnés */}
                <div className="space-y-3">
                  {formData.markets.map((market) => (
                    <Card key={market.country} className="border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-accent-500 mr-2" />
                          <span className="font-medium">{getCountryLabel(market.country)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-500 hover:text-red-500"
                            onClick={() => removeMarket(market.country)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center mb-2">
                          <Languages className="h-4 w-4 text-secondary-500 mr-2" />
                          <span className="text-sm font-medium">Languages</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {market.languages.map((language) => (
                            <Badge
                              key={language}
                              className="bg-secondary-50 text-secondary-700 hover:bg-secondary-100 px-3 py-1.5 flex items-center gap-1"
                            >
                              {getLanguageLabel(language)}
                              {market.languages.length > 1 && (
                                <button
                                  onClick={() => removeLanguageFromMarket(market.country, language)}
                                  className="ml-1 hover:bg-secondary-200 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          <button
                            onClick={() => setSelectedCountryForLanguages(market.country)}
                            className="border border-dashed border-gray-300 rounded-md px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 flex items-center"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add language
                          </button>
                        </div>

                        {/* Sélecteur de langues pour ce marché */}
                        {selectedCountryForLanguages === market.country && (
                          <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50 max-h-[200px] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {languages
                                .filter((language) => !market.languages.includes(language.value))
                                .map((language) => (
                                  <div
                                    key={language.value}
                                    className="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100"
                                    onClick={() => {
                                      addLanguageToMarket(market.country, language.value)
                                      setSelectedCountryForLanguages(null)
                                    }}
                                  >
                                    <span>{language.label}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}

                  {/* Bouton pour ajouter un nouveau marché */}
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 mt-2"
                    onClick={() => setShowCountrySelector(!showCountrySelector)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add a new market
                  </Button>

                  {/* Sélecteur de pays */}
                  {showCountrySelector && (
                    <Card className="border border-gray-200 mt-2">
                      <CardContent className="p-3">
                        <div className="max-h-[250px] overflow-y-auto">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {countries
                              .filter((country) => !formData.markets.some((market) => market.country === country.value))
                              .map((country) => (
                                <div
                                  key={country.value}
                                  className="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100"
                                  onClick={() => addMarket(country.value)}
                                >
                                  <span>{country.label}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="mt-3 pl-3 border-l-4 border-l-accent-300 bg-gray-50/50 p-2 rounded-r-md flex">
                  <Info className="h-4 w-4 text-accent-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs italic text-gray-500">
                    Select the markets you want to analyze and the languages for each market. AI models evaluate and
                    describe brands uniquely across various markets and languages. Competitors, consumer perceptions,
                    and search queries can vary significantly by region and language.
                  </p>
                </div>
              </div>

              {/* Alerte sur l'impact du plan */}
              {(formData.markets.length > 1 || formData.markets.some((market) => market.languages.length > 1)) && (
                <div className="mt-4 p-4 border border-accent-200 bg-accent-50 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-accent-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-accent-700">
                      Your selection requires a {planImpact} plan or higher
                    </p>
                    <p className="text-xs text-accent-600 mt-1">
                      You've selected {formData.markets.length} {formData.markets.length === 1 ? "market" : "markets"}{" "}
                      and {formData.markets.reduce((sum, market) => sum + market.languages.length, 0)}{" "}
                      {formData.markets.reduce((sum, market) => sum + market.languages.length, 0) === 1
                        ? "language"
                        : "languages"}
                      .
                    </p>
                    <div className="mt-2 flex">
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
            </CardContent>
          </Card>
        )}
      </div>
      <FeatureComparisonDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        recommendedPlan={planImpact.toLowerCase() as any}
      />
    </div>
  )
}
