"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useOnboarding } from "@/providers/onboarding-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Phone,
  Rocket,
  Shield,
  Sparkles,
  Briefcase,
  BarChart3,
  X,
  HelpCircle,
  ExternalLink,
  XCircle,
  Maximize2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

// Feature descriptions
const featureDescriptions = {
  pulse: "Mesure la visibilité et la présence de votre marque dans les réponses des modèles d'IA.",
  tone: "Analyse le ton et le sentiment associés à votre marque dans les réponses générées.",
  accord: "Évalue la cohérence des informations sur votre marque à travers différents modèles d'IA.",
  area: "Identifie les domaines thématiques où votre marque est le plus souvent mentionnée.",
  trace: "Suit l'évolution de la présence de votre marque dans le temps.",
  lift: "Fournit des recommandations personnalisées pour améliorer la présence de votre marque.",
  csv: "Permet d'exporter les données brutes au format CSV pour analyse approfondie.",
  api: "Accès programmatique aux données via une API REST.",
  custom_prompts: "Possibilité de définir vos propres prompts pour tester des scénarios spécifiques.",
  custom_personas: "Création de personas personnalisés pour simuler différents types d'utilisateurs.",
  daily_refresh: "Mise à jour quotidienne des données au lieu d'hebdomadaire.",
  white_label: "Portail personnalisé avec votre marque pour vos clients ou équipes.",
}

// Feature examples with detailed explanations
const featureExamples = {
  pulse: {
    title: "Pulse - Visibilité de votre marque",
    description:
      "Pulse mesure la fréquence et la pertinence avec laquelle votre marque apparaît dans les réponses des modèles d'IA. Cette métrique vous permet de comprendre votre visibilité globale dans l'écosystème de l'IA.",
    image: "/features/pulse-example.png",
    insights: [
      "Découvrez si votre marque est mentionnée spontanément dans les réponses pertinentes",
      "Comparez votre visibilité à celle de vos concurrents",
      "Identifiez les modèles d'IA où votre marque est la plus visible",
    ],
    metrics: [
      { name: "Score de visibilité", value: "72/100" },
      { name: "Taux de mention", value: "38%" },
      { name: "Rang sectoriel", value: "3/12" },
    ],
  },
  tone: {
    title: "Tone - Sentiment et perception",
    description:
      "Tone analyse le sentiment et le ton associés à votre marque dans les réponses générées par les modèles d'IA. Cette métrique vous aide à comprendre comment votre marque est perçue émotionnellement.",
    image: "/features/tone-example.png",
    insights: [
      "Évaluez si les mentions de votre marque sont positives, négatives ou neutres",
      "Identifiez les attributs émotionnels associés à votre marque",
      "Comparez la perception de votre marque à celle de vos concurrents",
    ],
    metrics: [
      { name: "Score de sentiment", value: "68/100" },
      { name: "Mentions positives", value: "62%" },
      { name: "Mentions négatives", value: "8%" },
    ],
  },
  accord: {
    title: "Accord - Cohérence entre modèles",
    description:
      "Accord mesure la cohérence des informations sur votre marque à travers différents modèles d'IA. Cette métrique vous permet d'identifier les divergences et les consensus entre les modèles.",
    image: "/features/accord-example.png",
    insights: [
      "Découvrez si les modèles d'IA sont cohérents dans leur représentation de votre marque",
      "Identifiez les modèles qui présentent des informations inexactes",
      "Comprenez les variations de perception entre différents modèles",
    ],
    metrics: [
      { name: "Score de cohérence", value: "81/100" },
      { name: "Taux de consensus", value: "76%" },
      { name: "Divergences majeures", value: "3" },
    ],
  },
  area: {
    title: "Area - Domaines thématiques",
    description:
      "Area identifie les domaines thématiques où votre marque est le plus souvent mentionnée. Cette métrique vous aide à comprendre dans quels contextes votre marque est associée.",
    image: "/features/area-example.png",
    insights: [
      "Découvrez les thèmes et sujets où votre marque est le plus souvent citée",
      "Identifiez de nouvelles opportunités de positionnement",
      "Comparez votre couverture thématique à celle de vos concurrents",
    ],
    metrics: [
      { name: "Domaines couverts", value: "7/10" },
      { name: "Domaine principal", value: "Innovation" },
      { name: "Opportunités", value: "3 domaines" },
    ],
  },
  trace: {
    title: "Trace - Évolution temporelle",
    description:
      "Trace suit l'évolution de la présence de votre marque dans le temps. Cette métrique vous permet de comprendre comment la perception de votre marque évolue avec les mises à jour des modèles d'IA.",
    image: "/features/trace-example.png",
    insights: [
      "Suivez l'évolution de votre visibilité au fil du temps",
      "Identifiez l'impact des mises à jour des modèles d'IA sur votre marque",
      "Mesurez l'efficacité de vos actions d'optimisation",
    ],
    metrics: [
      { name: "Tendance sur 3 mois", value: "+12%" },
      { name: "Stabilité", value: "Haute" },
      { name: "Prédiction", value: "En hausse" },
    ],
  },
  lift: {
    title: "Lift - Recommandations personnalisées",
    description:
      "Lift fournit des recommandations personnalisées pour améliorer la présence de votre marque dans les réponses des modèles d'IA. Cette fonctionnalité vous aide à optimiser votre stratégie de contenu.",
    image: "/features/lift-example.png",
    insights: [
      "Recevez des recommandations concrètes pour améliorer votre visibilité",
      "Identifiez les lacunes dans votre contenu web",
      "Obtenez des suggestions de formulations et de mots-clés",
    ],
    metrics: [
      { name: "Potentiel d'amélioration", value: "+28%" },
      { name: "Recommandations", value: "12 actions" },
      { name: "Priorité haute", value: "4 actions" },
    ],
  },
}

export default function PricingPlans() {
  const router = useRouter()
  const { formData } = useOnboarding()
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<string | null>("faq-1")
  // Modifier la déclaration de l'état activeTab pour n'avoir que "features" et "faq" comme options
  const [activeTab, setActiveTab] = useState<"features" | "faq">("features")
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Ajouter un nouvel état pour suivre les plans dont les modèles sont affichés
  const [expandedModels, setExpandedModels] = useState<string | null>(null)

  // Determine recommended plan based on user data
  const urlCount = formData.website ? 1 : 0
  const competitorCount = formData.competitors ? formData.competitors.filter((comp) => comp.selected).length : 0
  const promptCount =
    (formData.visibilityPrompts ? formData.visibilityPrompts.filter((p) => p.selected).length : 0) +
    (formData.perceptionPrompts ? formData.perceptionPrompts.filter((p) => p.selected).length : 0)

  // Mettre à jour la fonction getRecommendedPlan pour prendre en compte le changement de "pro" à "agencies"
  const getRecommendedPlan = () => {
    if (urlCount > 5 || competitorCount > 5) {
      return "agencies"
    } else if (urlCount > 1 || competitorCount > 2 || promptCount > 50) {
      return "growth"
    }
    return "starter"
  }

  const recommendedPlan = getRecommendedPlan()

  // Calculate yearly price (20% discount)
  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 12 * 0.8)
  }

  // Calculate savings
  const calculateSavings = (monthlyPrice: number | null) => {
    if (!monthlyPrice) return { amount: 0, percentage: 0 }

    const monthlyCost = monthlyPrice * 12
    const yearlyCost = getYearlyPrice(monthlyPrice)
    const savings = monthlyCost - yearlyCost
    const percentage = Math.round((savings / monthlyCost) * 100)

    return { amount: savings, percentage }
  }

  const handleStartTrial = (plan: string) => {
    // Mettre à jour la déclaration de l'état selectedPlan
    setSelectedPlan(plan as any)
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      router.push("/results")
    }, 1500)
  }

  // Feature definitions with detailed descriptions
  const features = {
    core: [
      { id: "pulse", name: "Pulse", description: featureDescriptions.pulse },
      { id: "tone", name: "Tone", description: featureDescriptions.tone },
      { id: "accord", name: "Accord", description: featureDescriptions.accord },
      { id: "area", name: "Area", description: featureDescriptions.area },
      { id: "trace", name: "Trace", description: featureDescriptions.trace },
    ],
    advanced: [
      { id: "lift", name: "Lift", description: featureDescriptions.lift },
      { id: "csv", name: "CSV Export", description: featureDescriptions.csv },
      { id: "api", name: "API Access", description: featureDescriptions.api, beta: true },
      { id: "custom_prompts", name: "Custom Prompts", description: featureDescriptions.custom_prompts },
      { id: "custom_personas", name: "Custom Personas", description: featureDescriptions.custom_personas },
      { id: "daily_refresh", name: "Daily Refresh", description: featureDescriptions.daily_refresh, beta: true },
      { id: "white_label", name: "White-label Portal", description: featureDescriptions.white_label },
    ],
  }

  // Mettre à jour les données des plans
  const plans = [
    {
      id: "starter",
      name: "Starter",
      monthlyPrice: 89,
      description: "Solo sites & early-stage brands",
      bestFor: "Solo sites & early-stage brands that want to see how AIs talk about them",
      recommended: recommendedPlan === "starter",
      features: ["1 URL, 1 market / language", "Weekly report", "5 AI models coverage", "Core features suite"],
      models: ["OpenAI: ChatGPT o4", "Anthropic: Claude 3.7", "Perplexity sonnar Pro", "Grok", "Gemini"],
      featureDetails: ["Pulse", "Tone", "Accord", "Area", "Trace"],
      featureAccess: {
        pulse: true,
        tone: true,
        accord: true,
        area: true,
        trace: true,
        lift: false,
        csv: false,
        api: false,
        custom_prompts: false,
        custom_personas: false,
        daily_refresh: false,
        white_label: false,
      },
      icon: <Building className="h-5 w-5" />,
      color: "bg-gray-100",
      textColor: "text-gray-700",
      accentColor: "bg-gray-800",
      hoverColor: "hover:bg-gray-900",
      borderColor: "border-gray-200",
    },
    {
      id: "growth",
      name: "Growth",
      monthlyPrice: 199,
      description: "Marketing teams running several properties or geos",
      bestFor: "Marketing teams running several properties or geos",
      recommended: recommendedPlan === "growth",
      features: [
        "Up to 3 URLs with 3 markets/languages each",
        "All Starter features plus Lift",
        "8+ AI models coverage",
        "CSV export for further analysis",
      ],
      models: [
        "All Starter models plus:",
        "Mistral Le Chat",
        "Deepseek",
        "Additional OpenAI & Anthropic models",
        "Additional Perplexity, Grok & Gemini models",
      ],
      featureDetails: [
        "All Starter features plus:",
        "Lift (for custom recommendations)",
        "CSV export with KPIs",
        "Full raw responses & metadata",
      ],
      featureAccess: {
        pulse: true,
        tone: true,
        accord: true,
        area: true,
        trace: true,
        lift: true,
        csv: true,
        api: false,
        custom_prompts: false,
        custom_personas: false,
        daily_refresh: false,
        white_label: false,
      },
      icon: <Rocket className="h-5 w-5" />,
      color: "bg-accent-50",
      textColor: "text-accent-700",
      accentColor: "bg-accent-500",
      hoverColor: "hover:bg-accent-600",
      borderColor: "border-accent-200",
    },
    {
      id: "agencies",
      name: "Agencies",
      monthlyPrice: null,
      description: "Agencies & in-house CoEs managing multiple brands",
      bestFor: "Agencies & in-house CoEs managing multiple brands",
      recommended: recommendedPlan === "agencies",
      features: [
        "Everything in Growth plus",
        "15 URLs with 3 markets/language",
        "Custom prompts & persona sets",
        "Daily data refresh option (beta)",
        "API access (beta)",
      ],
      models: ["All Growth models", "Priority access to new models"],
      featureDetails: [
        "All Growth features plus:",
        "Custom prompts set addition",
        "Custom persona set addition",
        "Daily data refresh (beta)",
        "API access (beta)",
      ],
      featureAccess: {
        pulse: true,
        tone: true,
        accord: true,
        area: true,
        trace: true,
        lift: true,
        csv: true,
        api: true,
        custom_prompts: true,
        custom_personas: true,
        daily_refresh: true,
        white_label: false,
      },
      icon: <Briefcase className="h-5 w-5" />,
      color: "bg-blue-50",
      textColor: "text-blue-700",
      accentColor: "bg-blue-600",
      hoverColor: "hover:bg-blue-700",
      borderColor: "border-blue-200",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      monthlyPrice: null,
      description: "Global brands needing security, SSO & bespoke prompts",
      bestFor: "Global brands needing security, SSO & bespoke prompts",
      recommended: false,
      features: [
        "All features, All models",
        "Unlimited URLs & geos",
        "Daily & on demand refresh, Dedicated CSM",
        "White-label portal for your clients or internal teams",
        "SOC 2-type II compliant",
      ],
      models: ["All models", "Early access to new models", "Custom model integration"],
      featureDetails: [
        "All Agencies features plus:",
        "White-label portal",
        "SOC 2-type II compliance",
        "CSV export / Raw JSON feed",
        "Roadmap influence",
      ],
      featureAccess: {
        pulse: true,
        tone: true,
        accord: true,
        area: true,
        trace: true,
        lift: true,
        csv: true,
        api: true,
        custom_prompts: true,
        custom_personas: true,
        daily_refresh: true,
        white_label: true,
      },
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-purple-50",
      textColor: "text-purple-700",
      accentColor: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      borderColor: "border-purple-200",
    },
  ]

  // FAQ data
  const faqItems = [
    {
      id: "faq-1",
      question: "How does billing work?",
      answer:
        "When you subscribe, you'll be charged immediately for your first billing period. You can cancel anytime and we offer a 30-day money-back guarantee if you're not satisfied with our service.",
    },
    {
      id: "faq-2",
      question: "What's the difference between the plans?",
      answer:
        "The main differences are the number of URLs you can monitor, markets/languages covered, refresh frequency, and available features. Starter is perfect for single brands, Growth for teams managing multiple properties, Pro for agencies, and Enterprise for global brands with advanced security needs.",
    },
    {
      id: "faq-3",
      question: "Can I change plans later?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the new rate will apply to your next billing cycle.",
    },
    {
      id: "faq-4",
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day money-back guarantee. If you're not satisfied with our service within the first 30 days, we'll refund your payment - no questions asked.",
    },
    {
      id: "faq-5",
      question: "What are the core features like Pulse, Tone, etc.?",
      answer:
        "Our core features help you understand your brand's AI presence: Pulse measures visibility, Tone analyzes sentiment, Accord evaluates consistency across AI models, Area identifies key thematic domains, and Trace tracks changes over time.",
    },
    {
      id: "faq-6",
      question: "Can I cancel my subscription?",
      answer:
        "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
    },
  ]

  // Feature tooltip component
  const FeatureTooltip = ({ feature, children }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center cursor-help">
            {children}
            <HelpCircle className="h-3.5 w-3.5 ml-1 text-gray-400" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{feature.description}</p>
          {feature.beta && <Badge className="mt-1 bg-amber-100 text-amber-800">Beta</Badge>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // Feature example modal component
  const FeatureExampleModal = ({ featureId }) => {
    const feature = featureExamples[featureId]
    if (!feature) return null

    return (
      <DialogContent className={`${isFullscreen ? "max-w-[90vw] h-[90vh]" : "max-w-3xl"} overflow-auto`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{feature.title}</DialogTitle>
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 rounded-md hover:bg-gray-100">
                <Maximize2 className="h-5 w-5 text-gray-500" />
              </button>
              <DialogClose className="p-1 rounded-md hover:bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-500" />
              </DialogClose>
            </div>
          </div>
          <DialogDescription className="text-gray-600">{feature.description}</DialogDescription>
        </DialogHeader>

        <div className="relative mt-4 rounded-lg overflow-hidden border border-gray-200">
          <Image
            src={feature.image || "/placeholder.svg"}
            alt={feature.title}
            width={1200}
            height={800}
            className="w-full object-cover"
          />
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Insights clés</h3>
            <ul className="space-y-2">
              {feature.insights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                  <span className="text-sm text-gray-600">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Métriques principales</h3>
            <div className="space-y-3">
              {feature.metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                  <Badge className="bg-accent-100 text-accent-700">{metric.value}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-medium mb-3">Plans incluant cette fonctionnalité</h3>
          <div className="flex flex-wrap gap-2">
            {plans.map(
              (plan) =>
                plan.featureAccess[featureId] && (
                  <Badge key={plan.id} className={`${plan.color} ${plan.textColor} border ${plan.borderColor}`}>
                    {plan.name}
                  </Badge>
                ),
            )}
          </div>
        </div>
      </DialogContent>
    )
  }

  // Feature card component for the features tab
  const FeatureCard = ({ feature }) => {
    const featureId = feature.id
    const hasExample = !!featureExamples[featureId]

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
        <h3 className="text-lg font-semibold mb-2 text-mono-900 flex items-center justify-between">
          {feature.name}
          {feature.beta && <Badge className="bg-amber-100 text-amber-800">Beta</Badge>}
        </h3>
        <p className="text-gray-600 mb-4">{feature.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">Available in:</div>
          <div className="flex space-x-2">
            {plans.map(
              (plan) =>
                plan.featureAccess[feature.id] && (
                  <Badge key={plan.id} className={`${plan.color} ${plan.textColor} border ${plan.borderColor}`}>
                    {plan.name}
                  </Badge>
                ),
            )}
          </div>
        </div>

        {hasExample && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-4 flex items-center justify-center"
                onClick={() => setSelectedFeature(featureId)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir un exemple
              </Button>
            </DialogTrigger>
            <FeatureExampleModal featureId={featureId} />
          </Dialog>
        )}
      </div>
    )
  }

  // Feature badge component for the plan cards
  const FeatureBadge = ({ featureId, plan }) => {
    const feature = [...features.core, ...features.advanced].find((f) => f.id === featureId)
    const hasExample = !!featureExamples[featureId]

    if (!feature) return null

    // Si la fonctionnalité n'est pas disponible dans ce plan, afficher un badge désactivé
    if (!plan.featureAccess[featureId]) {
      return (
        <div className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
          {feature.name}
          {feature.beta && <span className="ml-1 text-amber-500">β</span>}
        </div>
      )
    }

    // Si la fonctionnalité est disponible mais n'a pas d'exemple, afficher un badge normal
    if (!hasExample) {
      return (
        <div
          className={`px-2 py-1 rounded-md text-xs font-medium ${plan.color} ${plan.textColor} border ${plan.borderColor}`}
        >
          {feature.name}
          {feature.beta && <span className="ml-1 text-amber-500">β</span>}
        </div>
      )
    }

    // Si la fonctionnalité est disponible et a un exemple, afficher un badge cliquable
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div
            className={`px-2 py-1 rounded-md text-xs font-medium cursor-pointer 
              ${plan.color} ${plan.textColor} border ${plan.borderColor} 
              hover:shadow-md hover:brightness-95 transition-all duration-200 
              flex items-center justify-center`}
            onClick={() => setSelectedFeature(featureId)}
          >
            {feature.name}
            {feature.beta && <span className="ml-1 text-amber-500">β</span>}
            <ExternalLink className="h-3 w-3 ml-1" />
          </div>
        </DialogTrigger>
        <FeatureExampleModal featureId={featureId} />
      </Dialog>
    )
  }

  // Ajouter cette fonction pour gérer le clic sur la ligne des modèles d'IA
  const toggleModelsVisibility = (planId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedModels(expandedModels === planId ? null : planId)
  }

  // Mettre à jour la déclaration de l'état selectedPlan
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "growth" | "agencies" | "enterprise">("growth")

  return (
    <div className="py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-100 text-accent-500 mb-4">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Your Brand Analysis is Ready!</h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-4">
          Choose a plan to access your full report and start optimizing your brand's AI presence.
        </p>

        <div className="flex items-center justify-center">
          <Badge className="bg-green-100 text-green-700 px-3 py-1">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Analysis complete for <span className="font-medium ml-1">{formData.brandName || "Your Brand"}</span>
          </Badge>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="max-w-md mx-auto mb-10 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Your analysis includes:</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">Brand visibility analysis</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Complete
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">Competitor comparison</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {formData.competitors?.filter((c) => c.selected).length || 0} competitors
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm">AI model responses</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {(formData.visibilityPrompts?.filter((p) => p.selected).length || 0) +
                (formData.perceptionPrompts?.filter((p) => p.selected).length || 0)}{" "}
              prompts
            </Badge>
          </div>
        </div>
      </div>

      {/* Billing Toggle - Only show on Plans tab */}
      {/* Modifier la condition pour l'affichage du toggle de facturation pour qu'il soit toujours visible
      // Remplacer {activeTab === "plans" && ( par simplement ( */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-gray-100 p-1 rounded-full">
          <button
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              billingPeriod === "monthly" ? "bg-white text-mono-900 shadow-sm" : "text-mono-600"
            }`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
              billingPeriod === "yearly" ? "bg-white text-mono-900 shadow-sm" : "text-mono-600"
            }`}
            onClick={() => setBillingPeriod("yearly")}
          >
            Yearly
            <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">Save 20%</span>
          </button>
        </div>
      </div>

      {/* PLANS TAB */}
      {/* Modifier la condition pour l'affichage des plans pour qu'ils soient toujours visibles
      // Remplacer la condition {activeTab === "plans" && ( par simplement ( */}
      <>
        {/* Pricing Cards - Desktop */}
        <div className="hidden md:block max-w-7xl mx-auto mb-12">
          <div className="grid grid-cols-4 gap-4">
            {plans.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.monthlyPrice : getYearlyPrice(plan.monthlyPrice || 0)
              const savings = calculateSavings(plan.monthlyPrice)
              const isRecommended = plan.recommended
              const isSelected = selectedPlan === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border ${plan.borderColor} bg-white transition-all duration-300
                    ${isRecommended ? "shadow-md transform scale-105 z-10" : "shadow-sm"}
                    ${isSelected ? `ring-2 ring-${plan.textColor.replace("text-", "")}` : ""}
                    hover:shadow-lg hover:-translate-y-1`}
                >
                  {/* Recommended Badge */}
                  {isRecommended && (
                    <div className="absolute -top-3 left-0 right-0 mx-auto w-max px-3 py-1 bg-accent-500 text-white text-xs font-medium rounded-full shadow-sm">
                      RECOMMENDED
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className={`p-6 ${isRecommended ? "pt-8" : "pt-6"}`}>
                    <div className="flex items-center mb-4">
                      <div className={`p-2 rounded-md ${plan.color} ${plan.textColor} mr-3`}>{plan.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-mono-900">{plan.name}</h3>
                        <p className="text-xs text-gray-500">{plan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      {plan.monthlyPrice ? (
                        <>
                          <div className="flex items-baseline">
                            <span className="text-3xl font-bold text-mono-900">€{price}</span>
                            <span className="text-gray-500 ml-1 text-sm">
                              /{billingPeriod === "monthly" ? "mo" : "yr"}
                            </span>
                          </div>
                          {billingPeriod === "yearly" && savings.amount > 0 && (
                            <div className="mt-1 text-xs text-green-600 font-medium flex items-center">
                              <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                              Save €{savings.amount} per year
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="text-xl font-bold text-mono-900">Contact us</span>
                        </div>
                      )}
                    </div>

                    {/* Best For */}
                    <p className="text-sm text-gray-600 mb-6">{plan.bestFor}</p>

                    {/* Features */}
                    <div className="space-y-4 mb-6">
                      <h4 className="text-sm font-medium text-gray-700">Includes:</h4>
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => {
                          // Vérifier si c'est la ligne des modèles d'IA
                          const isAIModelsFeature =
                            typeof feature === "string" && feature.includes("AI models coverage")

                          return (
                            <li key={index} className="flex items-start">
                              <Check className={`h-4 w-4 ${plan.textColor} mr-2 mt-0.5 flex-shrink-0`} />
                              {isAIModelsFeature ? (
                                <div
                                  className="flex items-center cursor-pointer group w-full"
                                  onClick={(e) => toggleModelsVisibility(plan.id, e)}
                                >
                                  <span className="text-sm text-gray-600 group-hover:text-accent-600 transition-colors">
                                    {feature}
                                  </span>
                                  <ChevronDown
                                    className={`h-4 w-4 ml-1.5 text-gray-400 group-hover:text-accent-600 transition-transform ${expandedModels === plan.id ? "rotate-180" : ""}`}
                                  />
                                </div>
                              ) : (
                                <span className="text-sm text-gray-600">
                                  {typeof feature === "string" ? feature : feature.text}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>

                      {/* Afficher les modèles d'IA si ce plan est développé */}
                      {expandedModels === plan.id && (
                        <div className="mt-2 bg-gray-50 rounded-md p-3 text-sm border border-gray-200">
                          <h5 className="font-medium text-gray-700 mb-2">AI Models:</h5>
                          <ul className="space-y-1">
                            {plan.models.map((model, idx) => (
                              <li key={idx} className="flex items-start text-gray-600">
                                <span className={`${plan.textColor} mr-1.5`}>•</span> {model}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Core Features */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Core Features:</h4>
                      <div className="flex flex-wrap gap-2">
                        {features.core.map((feature) => (
                          <FeatureBadge key={feature.id} featureId={feature.id} plan={plan} />
                        ))}
                      </div>
                    </div>

                    {/* Advanced Features */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Features:</h4>
                      <div className="flex flex-wrap gap-2">
                        {features.advanced.map((feature) => (
                          <FeatureBadge key={feature.id} featureId={feature.id} plan={plan} />
                        ))}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <div
                      className={`text-sm ${plan.textColor} cursor-pointer hover:underline flex items-center justify-center mb-4`}
                      onClick={() => setExpandedSection(expandedSection === plan.id ? null : plan.id)}
                    >
                      {expandedSection === plan.id ? "Hide details" : "View details"}
                      {expandedSection === plan.id ? (
                        <ChevronUp className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedSection === plan.id && (
                      <div className="bg-gray-50 rounded-md p-4 mb-6 text-sm">
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-700 mb-2">AI Models:</h5>
                          <ul className="space-y-1">
                            {plan.models.map((model, idx) => (
                              <li key={idx} className="flex items-start text-gray-600">
                                <span className={`${plan.textColor} mr-1.5`}>•</span> {model}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mb-4">
                          <h5 className="font-medium text-gray-700 mb-2">Feature Details:</h5>
                          <ul className="space-y-1">
                            {plan.featureDetails.map((detail, idx) => (
                              <li key={idx} className="flex items-start text-gray-600">
                                <span className={`${plan.textColor} mr-1.5`}>•</span> {detail}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Support:</h5>
                          <p className="text-gray-600">
                            {plan.id === "enterprise"
                              ? "Dedicated account manager with priority support"
                              : plan.id === "agencies"
                                ? "Priority email support with 24-hour response time"
                                : plan.id === "growth"
                                  ? "Email support with 48-hour response time"
                                  : "Community support"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    {plan.id !== "enterprise" ? (
                      <Button
                        className={`w-full ${plan.accentColor} ${plan.hoverColor} text-white h-11`}
                        onClick={() => handleStartTrial(plan.id)}
                        disabled={isSubmitting && isSelected}
                      >
                        {isSubmitting && isSelected ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          <>Start Now</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${plan.accentColor} ${plan.hoverColor} text-white h-11`}
                        onClick={() => window.open("mailto:sales@brandgpt.com?subject=Enterprise Plan Inquiry")}
                      >
                        <Phone className="h-4 w-4 mr-2" /> Contact Sales
                      </Button>
                    )}

                    {/* No Credit Card */}
                    {plan.id !== "enterprise" && (
                      <p className="text-xs text-center text-gray-500 mt-2">Cancel anytime</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pricing Cards - Mobile */}
        <div className="md:hidden max-w-sm mx-auto mb-12">
          <Tabs defaultValue="growth" className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              {plans.map((plan) => (
                <TabsTrigger key={plan.id} value={plan.id} className={plan.recommended ? "relative" : ""}>
                  {plan.recommended && (
                    <span className="absolute -top-6 left-0 right-0 text-xs font-medium text-accent-500">
                      RECOMMENDED
                    </span>
                  )}
                  {plan.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {plans.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.monthlyPrice : getYearlyPrice(plan.monthlyPrice || 0)
              const savings = calculateSavings(plan.monthlyPrice)

              return (
                <TabsContent key={plan.id} value={plan.id} className="mt-0">
                  <div className={`rounded-xl border ${plan.borderColor} bg-white shadow-sm`}>
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className={`p-2 rounded-md ${plan.color} ${plan.textColor} mr-3`}>{plan.icon}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-mono-900">{plan.name}</h3>
                          <p className="text-xs text-gray-500">{plan.description}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-6 pb-6 border-b border-gray-100">
                        {plan.monthlyPrice ? (
                          <>
                            <div className="flex items-baseline">
                              <span className="text-3xl font-bold text-mono-900">€{price}</span>
                              <span className="text-gray-500 ml-1 text-sm">
                                /{billingPeriod === "monthly" ? "mo" : "yr"}
                              </span>
                            </div>
                            {billingPeriod === "yearly" && savings.amount > 0 && (
                              <div className="mt-1 text-xs text-green-600 font-medium flex items-center">
                                <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                                Save €{savings.amount} per year
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-baseline">
                            <span className="text-xl font-bold text-mono-900">Contact us</span>
                          </div>
                        )}
                      </div>

                      {/* Best For */}
                      <p className="text-sm text-gray-600 mb-6">{plan.bestFor}</p>

                      {/* Features */}
                      <div className="space-y-4 mb-6">
                        <h4 className="text-sm font-medium text-gray-700">Includes:</h4>
                        <ul className="space-y-3">
                          {plan.features.map((feature, index) => {
                            // Vérifier si c'est la ligne des modèles d'IA
                            const isAIModelsFeature =
                              typeof feature === "string" && feature.includes("AI models coverage")

                            return (
                              <li key={index} className="flex items-start">
                                <Check className={`h-4 w-4 ${plan.textColor} mr-2 mt-0.5 flex-shrink-0`} />
                                {isAIModelsFeature ? (
                                  <div
                                    className="flex items-center cursor-pointer group w-full"
                                    onClick={(e) => toggleModelsVisibility(plan.id, e)}
                                  >
                                    <span className="text-sm text-gray-600 group-hover:text-accent-600 transition-colors">
                                      {feature}
                                    </span>
                                    <ChevronDown
                                      className={`h-4 w-4 ml-1.5 text-gray-400 group-hover:text-accent-600 transition-transform ${expandedModels === plan.id ? "rotate-180" : ""}`}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-600">
                                    {typeof feature === "string" ? feature : feature.text}
                                  </span>
                                )}
                              </li>
                            )
                          })}
                        </ul>

                        {/* Afficher les modèles d'IA si ce plan est développé */}
                        {expandedModels === plan.id && (
                          <div className="mt-2 bg-gray-50 rounded-md p-3 text-sm border border-gray-200">
                            <h5 className="font-medium text-gray-700 mb-2">AI Models:</h5>
                            <ul className="space-y-1">
                              {plan.models.map((model, idx) => (
                                <li key={idx} className="flex items-start text-gray-600">
                                  <span className={`${plan.textColor} mr-1.5`}>•</span> {model}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Core Features */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Core Features:</h4>
                        <div className="flex flex-wrap gap-2">
                          {features.core.map((feature) => (
                            <FeatureBadge key={feature.id} featureId={feature.id} plan={plan} />
                          ))}
                        </div>
                      </div>

                      {/* Advanced Features */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Features:</h4>
                        <div className="flex flex-wrap gap-2">
                          {features.advanced.map((feature) => (
                            <FeatureBadge key={feature.id} featureId={feature.id} plan={plan} />
                          ))}
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <div
                        className={`text-sm ${plan.textColor} cursor-pointer hover:underline flex items-center justify-center mb-4`}
                        onClick={() => setExpandedSection(expandedSection === plan.id ? null : plan.id)}
                      >
                        {expandedSection === plan.id ? "Hide details" : "View details"}
                        {expandedSection === plan.id ? (
                          <ChevronUp className="h-4 w-4 ml-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                      </div>

                      {/* Expanded Details */}
                      {expandedSection === plan.id && (
                        <div className="bg-gray-50 rounded-md p-4 mb-6 text-sm">
                          <div className="mb-4">
                            <h5 className="font-medium text-gray-700 mb-2">AI Models:</h5>
                            <ul className="space-y-1">
                              {plan.models.map((model, idx) => (
                                <li key={idx} className="flex items-start text-gray-600">
                                  <span className={`${plan.textColor} mr-1.5`}>•</span> {model}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="mb-4">
                            <h5 className="font-medium text-gray-700 mb-2">Feature Details:</h5>
                            <ul className="space-y-1">
                              {plan.featureDetails.map((detail, idx) => (
                                <li key={idx} className="flex items-start text-gray-600">
                                  <span className={`${plan.textColor} mr-1.5`}>•</span> {detail}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">Support:</h5>
                            <p className="text-gray-600">
                              {plan.id === "enterprise"
                                ? "Dedicated account manager with priority support"
                                : plan.id === "agencies"
                                  ? "Priority email support with 24-hour response time"
                                  : plan.id === "growth"
                                    ? "Email support with 48-hour response time"
                                    : "Community support"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CTA Button */}
                      {plan.id !== "enterprise" ? (
                        <Button
                          className={`w-full ${plan.accentColor} ${plan.hoverColor} text-white h-11`}
                          onClick={() => handleStartTrial(plan.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </div>
                          ) : (
                            <>Start Now</>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${plan.accentColor} ${plan.hoverColor} text-white h-11`}
                          onClick={() => window.open("mailto:sales@brandgpt.com?subject=Enterprise Plan Inquiry")}
                        >
                          <Phone className="h-4 w-4 mr-2" /> Contact Sales
                        </Button>
                      )}

                      {/* No Credit Card */}
                      {plan.id !== "enterprise" && (
                        <p className="text-xs text-center text-gray-500 mt-2">Cancel anytime</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </div>
      </>

      {/* Navigation Tabs */}
      {/* Remplacer la section "Navigation Tabs" par cette nouvelle version avec seulement 2 boutons */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-gray-100 p-1 rounded-full">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === "features" ? "bg-white text-mono-900 shadow-sm" : "text-mono-600"
              }`}
              onClick={() => setActiveTab("features")}
            >
              Features
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === "faq" ? "bg-white text-mono-900 shadow-sm" : "text-mono-600"
              }`}
              onClick={() => setActiveTab("faq")}
            >
              FAQ
            </button>
          </div>
        </div>
      </div>

      {/* FEATURES TAB */}
      {activeTab === "features" && (
        <div className="max-w-4xl mx-auto mb-12">
          {/* Core Features Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-center mb-8">Core Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.core.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>

          {/* Advanced Features Section */}
          <div>
            <h2 className="text-2xl font-semibold text-center mb-8">Advanced Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.advanced.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ TAB */}
      {activeTab === "faq" && (
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-xl font-semibold text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg overflow-hidden ${
                  expandedFaq === item.id ? "border-accent-200 bg-accent-50" : "border-gray-200"
                }`}
              >
                <button
                  className="w-full px-4 py-3 text-left flex items-center justify-between focus:outline-none"
                  onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                >
                  <span className="font-medium text-gray-800">{item.question}</span>
                  {expandedFaq === item.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {expandedFaq === item.id && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-white">
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Comparison Table - Always visible */}
      <div className="max-w-4xl mx-auto mb-12">
        <h2 className="text-xl font-semibold text-center mb-6">Compare All Features</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">Feature</th>
                <th className="p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">Starter</th>
                <th className="p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200 bg-accent-50">
                  Growth
                </th>
                <th className="p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">Agencies</th>
                <th className="p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Basic features */}
              <tr>
                <td className="p-3 text-sm text-gray-700 border-b border-gray-200">URLs</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">1</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200 bg-accent-50">Up to 3</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">15</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-gray-700 border-b border-gray-200">Markets/Languages</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">1</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200 bg-accent-50">
                  3 per URL
                </td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">3 per URL</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">Unlimited</td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-gray-700 border-b border-gray-200">AI Models</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">5</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200 bg-accent-50">8+</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">All</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">All + Custom</td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-gray-700 border-b border-gray-200">Refresh Frequency</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">Weekly</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200 bg-accent-50">Weekly</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">Daily (beta)</td>
                <td className="p-3 text-center text-sm text-gray-600 border-b border-gray-200">Daily & On demand</td>
              </tr>

              {/* Core Features */}
              <tr className="bg-gray-50">
                <td colSpan={5} className="p-3 text-sm font-medium text-gray-700 border-b border-gray-200">
                  Core Features
                </td>
              </tr>

              {features.core.map((feature) => (
                <tr key={feature.id}>
                  <td className="p-3 text-sm text-gray-700 border-b border-gray-200">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center text-left hover:underline focus:outline-none">
                          {feature.name}
                          {featureExamples[feature.id] && <ExternalLink className="h-3.5 w-3.5 ml-1 text-gray-400" />}
                        </button>
                      </DialogTrigger>
                      {featureExamples[feature.id] && <FeatureExampleModal featureId={feature.id} />}
                    </Dialog>
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan.id}
                      className={`p-3 text-center border-b border-gray-200 ${plan.id === "growth" ? "bg-accent-50" : ""}`}
                    >
                      {plan.featureAccess[feature.id] ? (
                        <Check
                          className={`h-4 w-4 mx-auto ${plan.id === "starter" ? "text-gray-500" : plan.id === "growth" ? "text-accent-500" : plan.id === "agencies" ? "text-blue-500" : "text-purple-500"}`}
                        />
                      ) : (
                        <X className="h-4 w-4 text-gray-400 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Advanced Features */}
              <tr className="bg-gray-50">
                <td colSpan={5} className="p-3 text-sm font-medium text-gray-700 border-b border-gray-200">
                  Advanced Features
                </td>
              </tr>

              {features.advanced.map((feature) => (
                <tr key={feature.id}>
                  <td className="p-3 text-sm text-gray-700 border-b border-gray-200">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center text-left hover:underline focus:outline-none">
                          {feature.name} {feature.beta && <span className="text-xs text-amber-500 ml-1">(Beta)</span>}
                          {featureExamples[feature.id] && <ExternalLink className="h-3.5 w-3.5 ml-1 text-gray-400" />}
                        </button>
                      </DialogTrigger>
                      {featureExamples[feature.id] && <FeatureExampleModal featureId={feature.id} />}
                    </Dialog>
                  </td>
                  {plans.map((plan) => (
                    <td
                      key={plan.id}
                      className={`p-3 text-center border-b border-gray-200 ${plan.id === "growth" ? "bg-accent-50" : ""}`}
                    >
                      {plan.featureAccess[feature.id] ? (
                        <Check
                          className={`h-4 w-4 mx-auto ${plan.id === "starter" ? "text-gray-500" : plan.id === "growth" ? "text-accent-500" : plan.id === "agencies" ? "text-blue-500" : "text-purple-500"}`}
                        />
                      ) : (
                        <X className="h-4 w-4 text-gray-400 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Badges */}
      <div className="flex justify-center mb-10">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          <div className="flex items-center">
            <Lock className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600">Secure payment</span>
          </div>
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600">30-day money back guarantee</span>
          </div>
          <div className="flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm text-gray-600">Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-accent-50 border border-accent-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-xl font-semibold mb-3">Ready to optimize your brand's AI presence?</h3>
          <p className="text-gray-600 mb-6">
            Subscribe today and see how your brand is perceived across all major AI models.
          </p>
          <Button
            className={`bg-accent-500 hover:bg-accent-600 text-white h-12 px-8 text-lg shadow-sm hover:shadow-md transition-all`}
            onClick={() => handleStartTrial(recommendedPlan)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                Get Started with {plans.find((p) => p.id === recommendedPlan)?.name}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          <p className="text-sm text-gray-500 mt-3">Easy cancellation anytime. 30-day money-back guarantee.</p>
        </div>
      </div>
    </div>
  )
}
