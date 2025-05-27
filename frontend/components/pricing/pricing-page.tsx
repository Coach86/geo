"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/providers/onboarding-provider";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Lock,
  Phone,
  Shield,
  BarChart3,
  Zap,
  LineChart,
  BarChart,
  TrendingUp,
  Target,
  Layers,
  ArrowUpRight,
  Users,
  RefreshCw,
  Plus,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { FeatureExampleDialog } from "@/components/shared/dialogs/feature-example-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface PricingPageProps {
  forcedRecommendedPlan?: string;
}

export default function PricingPage({
  forcedRecommendedPlan,
}: PricingPageProps) {
  const router = useRouter();
  const { formData } = useOnboarding();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Ensure data is loaded from localStorage
  useEffect(() => {
    // Check if we have data
    const hasData =
      formData.markets.length > 0 ||
      formData.website ||
      formData.llmModels.some((m) => m.selected);
    setIsDataLoaded(hasData);

    // Log data for debugging
    console.log("Onboarding data in pricing page:", {
      website: formData.website,
      markets: formData.markets,
      modelCount: formData.llmModels.filter((m) => m.selected).length,
      competitorCount: formData.competitors.filter((c) => c.selected).length,
    });
  }, [formData]);

  // Calculate user requirements based on onboarding data
  const urlCount = formData.website ? 1 : 0;

  // Correctly count markets and languages
  const marketCount = formData.markets ? formData.markets.length : 0;
  const languageCount = formData.markets
    ? formData.markets.reduce(
        (sum, market) => sum + (market.languages?.length || 0),
        0
      )
    : 0;

  // Count selected models
  const modelCount = formData.llmModels
    ? formData.llmModels.filter((model) => model.selected).length
    : 0;

  // Count selected competitors
  const competitorCount = formData.competitors
    ? formData.competitors.filter((comp) => comp.selected).length
    : 0;

  // Count selected prompts
  const promptCount =
    (formData.visibilityPrompts
      ? formData.visibilityPrompts.filter((p) => p.selected).length
      : 0) +
    (formData.perceptionPrompts
      ? formData.perceptionPrompts.filter((p) => p.selected).length
      : 0);

  // Determine recommended plan based on user data
  const getRecommendedPlan = () => {
    // If a forced plan is provided, use it
    if (forcedRecommendedPlan) {
      return forcedRecommendedPlan;
    }

    // Otherwise calculate based on user data
    if (
      urlCount > 5 ||
      marketCount > 9 ||
      languageCount > 15 ||
      modelCount > 10 ||
      competitorCount > 5 ||
      promptCount > 100
    ) {
      return "agencies";
    } else if (
      urlCount > 1 ||
      marketCount > 3 ||
      languageCount > 5 ||
      modelCount > 5 ||
      competitorCount > 2 ||
      promptCount > 50
    ) {
      return "growth";
    }
    return "starter";
  };

  const recommendedPlan = getRecommendedPlan();

  // Set the selected plan to the recommended plan by default
  const [selectedPlan, setSelectedPlan] = useState<
    "starter" | "growth" | "enterprise" | "agencies"
  >(recommendedPlan as any);

  // Get reason for recommendation
  const getRecommendationReason = () => {
    if (forcedRecommendedPlan) {
      return "Based on your requirements from the onboarding process";
    }

    if (recommendedPlan === "agencies") {
      if (urlCount > 5) return "You need to monitor more than 5 URLs";
      if (marketCount > 9) return "You need to cover more than 9 markets";
      if (languageCount > 15)
        return "You need to support more than 15 languages";
      if (modelCount > 10) return "You selected more than 10 AI models";
      if (competitorCount > 5)
        return "You need to track more than 5 competitors";
      return "Your requirements need our Agencies plan";
    } else if (recommendedPlan === "growth") {
      if (urlCount > 1) return "You need to monitor multiple URLs";
      if (marketCount > 3) return "You need to cover multiple markets";
      if (languageCount > 5) return "You need to support multiple languages";
      if (modelCount > 5) return "You selected multiple AI models";
      if (competitorCount > 2) return "You need to track multiple competitors";
      if (promptCount > 50) return "You need to analyze many prompts";
      return "Your requirements need our Growth plan";
    }
    return "The Starter plan covers your basic needs";
  };

  const getYearlyPrice = (monthlyPrice: number) => {
    // Valeurs fixes pour les plans annuels
    if (monthlyPrice === 89) {
      return 69; // Prix mensuel équivalent pour Starter
    } else if (monthlyPrice === 199) {
      return 159; // Prix mensuel équivalent pour Growth
    }
    // Fallback au calcul standard (20% de réduction)
    return Math.round(monthlyPrice * 0.8);
  };

  const calculateSavings = (monthlyPrice: number | null) => {
    if (!monthlyPrice) return { amount: 0, percentage: 0 };

    // Valeurs fixes pour les économies annuelles
    if (monthlyPrice === 89) {
      return { amount: 240, percentage: Math.round((240 / (89 * 12)) * 100) };
    } else if (monthlyPrice === 199) {
      return { amount: 480, percentage: Math.round((480 / (199 * 12)) * 100) };
    }

    // Fallback au calcul standard
    const monthlyCost = monthlyPrice * 12;
    const yearlyCost = getYearlyPrice(monthlyPrice) * 12;
    const savings = monthlyCost - yearlyCost;
    const percentage = Math.round((savings / monthlyCost) * 100);

    return { amount: savings, percentage };
  };

  const handleStartTrial = (plan: string) => {
    setSelectedPlan(plan as any);
    setIsSubmitting(true);

    // Rediriger vers les liens Stripe en fonction du plan et de la période de facturation
    setTimeout(() => {
      if (plan === "starter") {
        if (billingPeriod === "monthly") {
          window.location.href =
            "https://buy.stripe.com/00wbJ2gbEaSSe8LecIasg08"; // Starter mensuel
        } else {
          window.location.href =
            "https://buy.stripe.com/eVqaEYgbEe54e8L5Gcasg0b"; // Starter annuel
        }
      } else if (plan === "growth") {
        if (billingPeriod === "monthly") {
          window.location.href =
            "https://buy.stripe.com/9B64gA5x0e548Orb0wasg09"; // Growth mensuel
        } else {
          window.location.href =
            "https://buy.stripe.com/cNi8wQ0cG7GGc0D5Gcasg0a"; // Growth annuel
        }
      }
    }, 500); // Délai court pour montrer l'état de chargement
  };

  const handleFeatureClick = (featureId: string) => {
    setSelectedFeature(featureId);
    setFeatureDialogOpen(true);
  };

  // Core features
  const coreFeatures = [
    {
      id: "pulse",
      name: "Pulse",
      description: "How often AIs mention your brand",
      icon: <LineChart className="h-5 w-5" />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      id: "tone",
      name: "Tone",
      description: "The sentiment expressed about you",
      icon: <BarChart className="h-5 w-5" />,
      color: "bg-green-50 text-green-600",
    },
    {
      id: "accord",
      name: "Accord",
      description: "Alignment with brand values",
      icon: <Target className="h-5 w-5" />,
      color: "bg-purple-50 text-purple-600",
    },
    {
      id: "arena",
      name: "Arena",
      description: "Your AI visibility vs competitors",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-orange-50 text-orange-600",
    },
    {
      id: "trace",
      name: "Trace",
      description: "What sources AIs rely on",
      icon: <Layers className="h-5 w-5" />,
      color: "bg-pink-50 text-pink-600",
    },
    {
      id: "lift",
      name: "Lift",
      description: "Actions to improve AI presence",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-accent-50 text-accent-600",
    },
  ];

  // FAQ data
  const faqItems = [
    {
      id: "faq-1",
      question: "Can I cancel my subscription?",
      answer:
        "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
    },
    {
      id: "faq-2",
      question: "What if my brand isn't mentioned yet?",
      answer:
        "This is actually common for newer brands and a perfect time to start monitoring. Our platform will help you understand why your brand might not be appearing and provide strategies to increase visibility in AI responses.",
    },
    {
      id: "faq-3",
      question: "Can I test custom prompts?",
      answer:
        "Yes, on our Agencies and Enterprise plans, you can create and test custom prompts to see how AI models respond to specific scenarios relevant to your brand or industry.",
    },
    {
      id: "faq-4",
      question: "Does this impact SEO?",
      answer:
        "While our platform doesn't directly impact SEO, the insights you gain about how AI models perceive your brand can inform your content strategy, which can indirectly benefit your SEO efforts.",
    },
    {
      id: "faq-5",
      question: "Can I monitor multiple brands?",
      answer:
        "Yes, depending on your plan. The Starter plan includes 1 brand, Growth includes up to 3 brands, Enterprise includes up to 15 brands, and Agencies offers unlimited brand monitoring.",
    },
    {
      id: "faq-6",
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day money-back guarantee. If you're not satisfied with our service within the first 30 days after your trial ends, we'll refund your payment - no questions asked.",
    },
  ];

  // Why it matters points
  const whyItMatters = [
    {
      title: "AI is becoming the new search",
      description:
        "Millions of users now ask AI models questions instead of searching on Google.",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      title: "Brand perception is evolving",
      description:
        "How AI models describe your brand directly impacts consumer decisions.",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Competitive advantage",
      description:
        "Early adopters who optimize for AI visibility gain significant market advantage.",
      icon: <ArrowUpRight className="h-5 w-5" />,
    },
  ];

  // Comparison table data
  const comparisonData = [
    {
      feature: "URLs included",
      starter: "1",
      growth: "3",
      enterprise: "15",
      agencies: "Unlimited",
    },
    {
      feature: "Markets/Languages",
      starter: "1",
      growth: "3 per URL",
      enterprise: "3 per URL",
      agencies: "Unlimited",
    },
    {
      feature: "Competitors tracked",
      starter: "5 per URL",
      growth: "5 per URL",
      enterprise: "Unlimited",
      agencies: "Unlimited",
    },
    {
      feature: "Spontaneous prompts",
      starter: "Up to 15",
      growth: "Up to 20",
      enterprise: "Unlimited",
      agencies: "Unlimited",
    },
    {
      feature: "AI models",
      starter: "5",
      growth: "8+",
      enterprise: "All",
      agencies: "All + Custom",
    },
    {
      feature: "Refresh frequency",
      starter: "Weekly",
      growth: "Weekly",
      enterprise: "Daily (beta)",
      agencies: "Daily & On demand",
    },
    {
      feature: "CSV Export",
      starter: false,
      growth: true,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "API Access",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "Custom prompts",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "Custom personas",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
    {
      feature: "White-label portal",
      starter: false,
      growth: false,
      enterprise: false,
      agencies: true,
    },
    {
      feature: "Dedicated CSM",
      starter: false,
      growth: false,
      enterprise: true,
      agencies: true,
    },
  ];

  // Pricing plans
  const pricingPlans = [
    {
      name: "Starter",
      badge: null,
      badgeColor: "",
      tagline: "For solo founders & small brands",
      tagBgColor: "bg-gray-100",
      tagTextColor: "text-gray-600",
      description: "Understand how AIs talk about your brand",
      price: billingPeriod === "monthly" ? "€89" : "€69",
      pricePeriod: "/mo",
      billedAnnually: billingPeriod === "yearly" ? true : false,
      savings: billingPeriod === "yearly" ? calculateSavings(89).amount : null,
      features: [
        "Track how often AIs mention you",
        "See the tone AIs use",
        "Check alignment with brand values",
        "Compare visibility with competitors",
        "Know which sources AIs use",
      ],
      included: ["1 brand, 1 market/language", "5 AI models", "Weekly reports"],
      ctaText: "Get Started",
      ctaAction: () => handleStartTrial("starter"),
      ctaColor: "bg-gray-800 hover:bg-gray-900",
      checkColor: "text-green-500",
      plusColor: "",
      isPopular: false,
    },
    {
      name: "Growth",
      badge: "Most Popular",
      badgeColor: "#6366f1", // Solid color instead of Tailwind class
      tagline: "For scaling marketing teams",
      tagBgColor: "bg-accent-100",
      tagTextColor: "text-accent-700",
      description: "Advanced insights & multi-brand coverage",
      price: billingPeriod === "monthly" ? "€199" : "€159",
      pricePeriod: "/mo",
      billedAnnually: billingPeriod === "yearly" ? true : false,
      savings: billingPeriod === "yearly" ? calculateSavings(199).amount : null,
      features: [
        "Track multiple brands and geographies",
        "Benchmark visibility vs competitors",
        "Improve brand alignment with Lift",
        "Export raw data (CSV)",
      ],
      included: [
        "3 brands, 3 markets each",
        "8+ AI models",
        "Lift + CSV Export",
      ],
      ctaText: "Get Started",
      ctaAction: () => handleStartTrial("growth"),
      ctaColor: "bg-accent-500 hover:bg-accent-600",
      checkColor: "text-accent-500",
      plusColor: "text-accent-500",
      isPopular: true,
    },
    {
      name: "Enterprise",
      badge: null,
      badgeColor: "",
      tagline: "For global brand teams",
      tagBgColor: "bg-purple-50",
      tagTextColor: "text-purple-700",
      description: "Global scalability with enterprise-grade support",
      price: "Contact Us",
      pricePeriod: "",
      savings: null,
      features: [
        "Monitor 15+ brands globally",
        "Use on-demand refresh and white-label dashboards",
        "Get SSO and dedicated support",
      ],
      included: [
        "All features from Growth",
        "15 brands, 3 markets each",
        "SSO and dedicated support",
      ],
      ctaText: "Contact Sales",
      ctaAction: () =>
        window.open(
          "mailto:contact@getmint.ai?subject=Enterprise Plan Inquiry"
        ),
      ctaColor: "bg-purple-600 hover:bg-purple-700",
      checkColor: "text-purple-500",
      plusColor: "text-purple-500",
      isPopular: false,
    },
    {
      name: "Agencies",
      badge: null,
      badgeColor: "",
      tagline: "For multi-client agencies",
      tagBgColor: "bg-teal-50",
      tagTextColor: "text-teal-700",
      description: "Custom solutions for multi-client management",
      price: "Contact Us",
      pricePeriod: "",
      savings: null,
      features: [
        "Monitor unlimited brands or clients",
        "Create custom prompts and personas",
        "Access daily refresh and API (beta)",
      ],
      included: [
        "All features from Growth",
        "Unlimited brands",
        "Prompts, personas, API (beta)",
      ],
      ctaText: "Contact Sales",
      ctaAction: () =>
        window.open("mailto:contact@getmint.ai?subject=Agencies Plan Inquiry"),
      ctaColor: "bg-teal-600 hover:bg-teal-700",
      checkColor: "text-teal-500",
      plusColor: "text-teal-500",
      isPopular: false,
    },
  ];

  return (
    <div className="py-12 animate-fade-in">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-mono-900 tracking-tight">
          Unlock how AI models perceive your brand
        </h1>
        <p className="text-xl text-mono-600 mb-8 max-w-3xl mx-auto">
          Get actionable insights from ChatGPT, Claude, Gemini and more.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <div className="bg-mono-50 rounded-xl p-6 max-w-xl w-full">
            <ul className="space-y-3 text-left">
              {[
                "Discover what AIs say about you (and competitors)",
                "Fix misalignment and optimize messaging",
                "Track visibility and perception across models",
              ].map((item, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-accent-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-mono-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-accent-500 hover:bg-accent-600 text-white px-8"
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-accent-200 text-accent-700"
          >
            <Phone className="h-4 w-4 mr-2" /> Contact Sales
          </Button>
        </div>
      </section>

      {/* Recommendation Banner - Always show */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <div className="bg-accent-50 border-2 border-accent-200 rounded-xl p-6 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="bg-accent-100 p-3 rounded-full mr-4">
                <CheckCircle2 className="h-6 w-6 text-accent-600" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-mono-900">
                  Your Recommended Plan
                </h3>
                <p className="text-mono-600">
                  Based on your requirements, we recommend the{" "}
                  <span className="font-semibold text-accent-700">
                    {recommendedPlan.charAt(0).toUpperCase() +
                      recommendedPlan.slice(1)}{" "}
                    Plan
                  </span>
                </p>
              </div>
            </div>
            <Button
              className={`${
                recommendedPlan === "starter"
                  ? "bg-gray-800 hover:bg-gray-900"
                  : recommendedPlan === "growth"
                  ? "bg-accent-500 hover:bg-accent-600"
                  : recommendedPlan === "enterprise"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-teal-600 hover:bg-teal-700"
              } text-white px-6`}
              onClick={() => {
                if (
                  recommendedPlan === "starter" ||
                  recommendedPlan === "growth"
                ) {
                  handleStartTrial(recommendedPlan);
                } else {
                  window.open(
                    `mailto:contact@getmint.ai?subject=${
                      recommendedPlan.charAt(0).toUpperCase() +
                      recommendedPlan.slice(1)
                    } Plan Inquiry`
                  );
                }
              }}
            >
              {recommendedPlan === "starter" || recommendedPlan === "growth"
                ? "Get Started"
                : "Contact Sales"}
            </Button>
          </div>
        </div>
      </section>

      {/* Requirements Summary - Always show */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <div className="bg-white border border-mono-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-mono-900">
              Your Requirements
            </h3>
            {!isDataLoaded && (
              <div className="flex items-center text-mono-500 text-sm">
                <Info className="h-4 w-4 mr-1" />
                <span>Default recommendation based on typical usage</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div
              className={`rounded-lg p-3 ${
                urlCount > 1
                  ? "bg-accent-50 border border-accent-200"
                  : "bg-mono-50"
              }`}
            >
              <p className="text-xs text-mono-500 mb-1">URLs</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{urlCount || 1}</p>
                {urlCount > 1 && (
                  <ArrowRight className="h-3 w-3 text-accent-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit:{" "}
                {recommendedPlan === "starter"
                  ? "1"
                  : recommendedPlan === "growth"
                  ? "3"
                  : "15+"}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                marketCount > 3
                  ? "bg-accent-50 border border-accent-200"
                  : "bg-mono-50"
              }`}
            >
              <p className="text-xs text-mono-500 mb-1">Markets</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{marketCount || 1}</p>
                {marketCount > 3 && (
                  <ArrowRight className="h-3 w-3 text-accent-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit:{" "}
                {recommendedPlan === "starter"
                  ? "1"
                  : recommendedPlan === "growth"
                  ? "3 per URL"
                  : "Unlimited"}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                languageCount > 5
                  ? "bg-accent-50 border border-accent-200"
                  : "bg-mono-50"
              }`}
            >
              <p className="text-xs text-mono-500 mb-1">Languages</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{languageCount || 1}</p>
                {languageCount > 5 && (
                  <ArrowRight className="h-3 w-3 text-accent-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit:{" "}
                {recommendedPlan === "starter"
                  ? "1"
                  : recommendedPlan === "growth"
                  ? "3 per market"
                  : "Unlimited"}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                modelCount > 5
                  ? "bg-accent-50 border border-accent-200"
                  : "bg-mono-50"
              }`}
            >
              <p className="text-xs text-mono-500 mb-1">AI Models</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{modelCount || 1}</p>
                {modelCount > 5 && (
                  <ArrowRight className="h-3 w-3 text-accent-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit:{" "}
                {recommendedPlan === "starter"
                  ? "5"
                  : recommendedPlan === "growth"
                  ? "8+"
                  : "All"}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                competitorCount > 2
                  ? "bg-accent-50 border border-accent-200"
                  : "bg-mono-50"
              }`}
            >
              <p className="text-xs text-mono-500 mb-1">Competitors</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{competitorCount || 0}</p>
                {competitorCount > 2 && (
                  <ArrowRight className="h-3 w-3 text-accent-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit:{" "}
                {recommendedPlan === "starter"
                  ? "2"
                  : recommendedPlan === "growth"
                  ? "5"
                  : "Unlimited"}
              </p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                promptCount > 50
                  ? "bg-accent-50 border border-accent-200"
                  : "bg-mono-50"
              }`}
            >
              <p className="text-xs text-mono-500 mb-1">Prompts</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{promptCount || 0}</p>
                {promptCount > 50 && (
                  <ArrowRight className="h-3 w-3 text-accent-500" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Limit:{" "}
                {recommendedPlan === "starter"
                  ? "50"
                  : recommendedPlan === "growth"
                  ? "100"
                  : "Unlimited"}
              </p>
            </div>
          </div>

          {/* Attributes section */}
          {formData.attributes && formData.attributes.length > 0 && (
            <div className="mb-4 p-3 bg-mono-50 rounded-lg">
              <p className="text-xs text-mono-500 mb-2">Brand Attributes</p>
              <div className="flex flex-wrap gap-1">
                {formData.attributes.map((attr, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-mono-100 text-mono-700 text-xs"
                  >
                    {attr}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start bg-accent-50 p-4 rounded-lg">
            <AlertCircle className="h-5 w-5 text-accent-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-accent-700 font-medium">
                {getRecommendationReason()}
              </p>
              <p className="text-xs text-accent-600 mt-1">
                {recommendedPlan === "starter" ? (
                  "Le plan Starter couvre tous vos besoins actuels."
                ) : recommendedPlan === "growth" ? (
                  <>
                    {urlCount > 1 &&
                      "Plusieurs URLs nécessitent au moins le plan Growth. "}
                    {marketCount > 3 &&
                      "Plus de 3 marchés nécessitent au moins le plan Growth. "}
                    {languageCount > 5 &&
                      "Plus de 5 langues nécessitent au moins le plan Growth. "}
                    {modelCount > 5 &&
                      "Plus de 5 modèles d'IA nécessitent au moins le plan Growth. "}
                    {competitorCount > 2 &&
                      "Plus de 2 concurrents nécessitent au moins le plan Growth. "}
                    {promptCount > 50 &&
                      "Plus de 50 prompts nécessitent au moins le plan Growth. "}
                  </>
                ) : (
                  <>
                    {urlCount > 5 &&
                      "Plus de 5 URLs nécessitent au moins le plan Agencies. "}
                    {marketCount > 9 &&
                      "Plus de 9 marchés nécessitent au moins le plan Agencies. "}
                    {languageCount > 15 &&
                      "Plus de 15 langues nécessitent au moins le plan Agencies. "}
                    {modelCount > 10 &&
                      "Plus de 10 modèles d'IA nécessitent au moins le plan Agencies. "}
                    {competitorCount > 5 &&
                      "Plus de 5 concurrents nécessitent au moins le plan Agencies. "}
                    {promptCount > 100 &&
                      "Plus de 100 prompts nécessitent au moins le plan Agencies. "}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              size="sm"
              className="text-accent-600"
              onClick={() => router.push("/onboarding")}
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Modify your requirements
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Toggle */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-mono-100 p-1 rounded-full">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-white text-mono-900 shadow-sm"
                  : "text-mono-600"
              }`}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                billingPeriod === "yearly"
                  ? "bg-white text-mono-900 shadow-sm"
                  : "text-mono-600"
              }`}
              onClick={() => setBillingPeriod("yearly")}
            >
              Yearly
              <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Plan Cards - Nouvelle structure avec grille stricte */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.slice(0, 3).map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-xl border ${
                  plan.name.toLowerCase() === recommendedPlan
                    ? "border-2 border-accent-500 bg-accent-50/20"
                    : plan.isPopular
                    ? "border-2 border-accent-300 bg-gray-50"
                    : "border-gray-200 bg-white"
                } shadow-md hover:shadow-lg transition-all duration-300 ${
                  plan.name.toLowerCase() === recommendedPlan
                    ? "transform hover:-translate-y-1"
                    : ""
                }`}
              >
                {/* Badge - Correction: utiliser une couleur solide au lieu d'une classe Tailwind */}
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-4 px-3 py-1 text-white text-xs font-medium rounded-full shadow-sm z-10"
                    style={{ backgroundColor: plan.badgeColor }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Recommended Badge */}
                {plan.name.toLowerCase() === recommendedPlan && (
                  <div className="absolute -top-3 left-4 px-3 py-1 text-white text-xs font-medium rounded-full shadow-sm z-10 bg-accent-500">
                    Recommended for You
                  </div>
                )}

                <div className="p-6 flex flex-col h-full">
                  {/* Section 1: Plan Header - Hauteur fixe */}
                  <div className="mb-4 h-[120px] flex flex-col">
                    <div className="flex items-center mb-1">
                      <h3 className="text-xl font-bold text-mono-900">
                        {plan.name}
                      </h3>
                    </div>
                    <div className="mb-2">
                      <span
                        className={`text-xs font-medium ${plan.tagTextColor} ${plan.tagBgColor} px-2 py-0.5 rounded-full`}
                      >
                        {plan.tagline}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-mono-700 mt-2">
                      {plan.description}
                    </p>
                  </div>

                  {/* Section 2: Price - Hauteur fixe */}
                  {/* Modifier l'affichage des prix dans la section des cartes de tarification
                  // Remplacer la section d'affichage des prix par celle-ci (dans le rendu des cartes): */}
                  <div className="pb-4 border-b border-mono-100 mb-4 h-[80px] flex items-center">
                    <div>
                      <div className="flex items-baseline">
                        <span
                          className={`${
                            plan.price === "Contact Us" ? "text-xl" : "text-3xl"
                          } font-bold text-mono-900`}
                        >
                          {plan.price}
                        </span>
                        {plan.pricePeriod && (
                          <span className="text-mono-500 ml-1 text-sm">
                            {plan.pricePeriod}
                          </span>
                        )}
                        {plan.billedAnnually && (
                          <span className="text-mono-500 ml-2 text-xs">
                            billed annually
                          </span>
                        )}
                      </div>
                      {plan.savings && (
                        <div className="mt-1 text-xs text-green-600 font-medium flex items-center">
                          <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                          Save €{plan.savings} per year
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Features - Hauteur augmentée pour éviter le chevauchement */}
                  <div className="mb-4 h-[240px]">
                    <h4 className="text-sm font-medium mb-4">
                      {index > 0 && (
                        <span
                          className={`${
                            index === 1
                              ? "bg-accent-100 text-accent-700"
                              : index === 2
                              ? "bg-purple-50 text-purple-700"
                              : "bg-teal-50 text-teal-700"
                          } px-2 py-1 rounded-md inline-block mb-1`}
                        >
                          Everything in {index === 1 ? "Starter" : "Growth"},
                          plus
                        </span>
                      )}
                      {index === 0 && (
                        <span className="text-mono-700">What you can do</span>
                      )}
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          {index === 0 ? (
                            <Check
                              className={`h-4 w-4 ${plan.checkColor} mr-2 mt-0.5 flex-shrink-0`}
                            />
                          ) : (
                            <Plus
                              className={`h-4 w-4 ${plan.plusColor} mr-2 mt-0.5 flex-shrink-0`}
                            />
                          )}
                          <span className="text-sm text-mono-600">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 4: What's included - Hauteur réduite pour éviter le chevauchement */}
                  <div className="mb-4 h-[120px] py-4">
                    <h4 className="text-sm font-medium text-mono-700 mb-3">
                      What's included
                    </h4>
                    <ul className="space-y-2">
                      {plan.included.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <Check
                            className={`h-4 w-4 ${plan.checkColor} mr-2 mt-0.5 flex-shrink-0`}
                          />
                          <span className="text-sm text-mono-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 5: CTA Button - Hauteur fixe */}
                  <div className="mt-auto pt-8 h-[100px]">
                    <Button
                      className={`w-full ${
                        plan.name.toLowerCase() === recommendedPlan
                          ? "bg-accent-500 hover:bg-accent-600 text-white ring-2 ring-accent-300 ring-offset-2"
                          : plan.ctaColor
                      } text-white h-11`}
                      onClick={plan.ctaAction}
                      disabled={
                        isSubmitting && selectedPlan === plan.name.toLowerCase()
                      }
                    >
                      {isSubmitting &&
                      selectedPlan === plan.name.toLowerCase() ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <>
                          {plan.ctaText === "Contact Sales" && (
                            <Phone className="h-4 w-4 mr-2" />
                          )}
                          {plan.ctaText}
                        </>
                      )}
                    </Button>
                    {plan.ctaText === "Get Started" && (
                      <p className="text-xs text-center text-mono-500 mt-2">
                        Cancel anytime
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Agencies Plan - Séparé et avec un fond différent */}
          <div className="md:col-span-1">
            <div
              className={`relative rounded-xl border ${
                recommendedPlan === "agencies"
                  ? "border-2 border-accent-500 bg-teal-50/50 transform hover:-translate-y-1"
                  : "border-teal-200 bg-teal-50/30"
              } shadow-md hover:shadow-lg transition-all duration-300 h-full`}
            >
              {/* Recommended Badge */}
              {recommendedPlan === "agencies" && (
                <div className="absolute -top-3 left-4 px-3 py-1 text-white text-xs font-medium rounded-full shadow-sm z-10 bg-accent-500">
                  Recommended for You
                </div>
              )}

              <div className="p-6 flex flex-col h-full">
                {/* Section 1: Plan Header - Hauteur fixe */}
                <div className="mb-4 h-[120px] flex flex-col">
                  <div className="flex items-center mb-1">
                    <h3 className="text-xl font-bold text-mono-900">
                      {pricingPlans[3].name}
                    </h3>
                  </div>
                  <div className="mb-2">
                    <span
                      className={`text-xs font-medium ${pricingPlans[3].tagTextColor} ${pricingPlans[3].tagBgColor} px-2 py-0.5 rounded-full`}
                    >
                      {pricingPlans[3].tagline}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-mono-700 mt-2">
                    {pricingPlans[3].description}
                  </p>
                </div>

                {/* Section 2: Price - Hauteur fixe */}
                <div className="pb-4 border-b border-teal-200 mb-4 h-[80px] flex items-center">
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-xl font-bold text-mono-900">
                        {pricingPlans[3].price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Features - Hauteur augmentée pour éviter le chevauchement */}
                <div className="mb-4 h-[240px]">
                  <h4 className="text-sm font-medium mb-4">
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-md inline-block mb-1">
                      Built for client impact
                    </span>
                  </h4>
                  <ul className="space-y-3">
                    {pricingPlans[3].features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Plus
                          className={`h-4 w-4 ${pricingPlans[3].plusColor} mr-2 mt-0.5 flex-shrink-0`}
                        />
                        <span className="text-sm text-mono-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 4: What's included - Hauteur réduite pour éviter le chevauchement */}
                <div className="mb-4 h-[120px] py-4">
                  <h4 className="text-sm font-medium text-mono-700 mb-3">
                    What's included
                  </h4>
                  <ul className="space-y-2">
                    {pricingPlans[3].included.map((item, i) => (
                      <li key={i} className="flex items-start">
                        <Check
                          className={`h-4 w-4 ${pricingPlans[3].checkColor} mr-2 mt-0.5 flex-shrink-0`}
                        />
                        <span className="text-sm text-mono-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 5: CTA Button - Hauteur fixe */}
                <div className="mt-auto pt-8 h-[100px]">
                  <Button
                    className={`w-full ${
                      recommendedPlan === "agencies"
                        ? "bg-accent-500 hover:bg-accent-600 text-white ring-2 ring-accent-300 ring-offset-2"
                        : pricingPlans[3].ctaColor
                    } text-white h-11`}
                    onClick={pricingPlans[3].ctaAction}
                    disabled={
                      isSubmitting &&
                      selectedPlan === pricingPlans[3].name.toLowerCase()
                    }
                  >
                    {isSubmitting &&
                    selectedPlan === pricingPlans[3].name.toLowerCase() ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <Phone className="h-4 w-4 mr-2" />
                        {pricingPlans[3].ctaText}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-mono-900">
          Feature Comparison
        </h2>
        <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-mono-200">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left text-mono-700 font-medium border-b border-mono-200">
                  Features
                </th>
                <th
                  className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                    recommendedPlan === "starter" ? "bg-accent-100" : ""
                  }`}
                >
                  {recommendedPlan === "starter" && (
                    <div className="mb-1">
                      <Badge className="bg-accent-500 text-white">
                        Recommended
                      </Badge>
                    </div>
                  )}
                  Starter
                </th>
                <th
                  className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                    recommendedPlan === "growth"
                      ? "bg-accent-100"
                      : "bg-accent-50"
                  }`}
                >
                  {recommendedPlan === "growth" && (
                    <div className="mb-1">
                      <Badge className="bg-accent-500 text-white">
                        Recommended
                      </Badge>
                    </div>
                  )}
                  Growth
                </th>
                <th
                  className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                    recommendedPlan === "enterprise" ? "bg-accent-100" : ""
                  }`}
                >
                  {recommendedPlan === "enterprise" && (
                    <div className="mb-1">
                      <Badge className="bg-accent-500 text-white">
                        Recommended
                      </Badge>
                    </div>
                  )}
                  Enterprise
                </th>
                <th
                  className={`p-4 text-center text-mono-700 font-medium border-b border-mono-200 ${
                    recommendedPlan === "agencies"
                      ? "bg-accent-100"
                      : "bg-teal-50"
                  }`}
                >
                  {recommendedPlan === "agencies" && (
                    <div className="mb-1">
                      <Badge className="bg-accent-500 text-white">
                        Recommended
                      </Badge>
                    </div>
                  )}
                  Agencies
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-mono-50" : "bg-white"}
                >
                  <td className="p-4 text-mono-800 border-b border-mono-200 font-medium">
                    <div className="flex items-center">
                      <span>{row.feature}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1.5 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-[200px]"
                          >
                            <p className="text-xs">
                              {row.feature === "URLs included" &&
                                "Number of websites you can monitor simultaneously"}
                              {row.feature === "Markets/Languages" &&
                                "Geographic markets and languages covered per URL"}
                              {row.feature === "AI models" &&
                                "Number of AI models used for analysis"}
                              {row.feature === "Refresh frequency" &&
                                "How often your data is updated"}
                              {row.feature === "CSV Export" &&
                                "Export raw data for further analysis"}
                              {row.feature === "API Access" &&
                                "Programmatic access to your data (beta)"}
                              {row.feature === "Custom prompts" &&
                                "Create your own prompts for testing"}
                              {row.feature === "Custom personas" &&
                                "Create user personas for targeted testing"}
                              {row.feature === "White-label portal" &&
                                "Branded dashboard for your clients"}
                              {row.feature === "Dedicated CSM" &&
                                "Dedicated Customer Success Manager"}
                              {row.feature === "Competitors tracked" &&
                                "Number of competitors you can track"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td
                    className={`p-4 text-center border-b border-mono-200 ${
                      recommendedPlan === "starter" ? "bg-accent-50" : ""
                    }`}
                  >
                    {typeof row.starter === "boolean" ? (
                      row.starter ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-mono-400 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm">{row.starter}</span>
                    )}
                  </td>
                  <td
                    className={`p-4 text-center border-b border-mono-200 ${
                      recommendedPlan === "growth"
                        ? "bg-accent-50"
                        : "bg-accent-50/30"
                    }`}
                  >
                    {typeof row.growth === "boolean" ? (
                      row.growth ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-mono-400 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm">{row.growth}</span>
                    )}
                  </td>
                  <td
                    className={`p-4 text-center border-b border-mono-200 ${
                      recommendedPlan === "enterprise" ? "bg-accent-50" : ""
                    }`}
                  >
                    {typeof row.enterprise === "boolean" ? (
                      row.enterprise ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-mono-400 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm">{row.enterprise}</span>
                    )}
                  </td>
                  <td
                    className={`p-4 text-center border-b border-mono-200 ${
                      recommendedPlan === "agencies"
                        ? "bg-accent-50"
                        : "bg-teal-50/30"
                    }`}
                  >
                    {typeof row.agencies === "boolean" ? (
                      row.agencies ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-mono-400 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm">{row.agencies}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-mono-500">
            Need a custom plan?{" "}
            <a
              href="mailto:contact@getmint.ai"
              className="text-accent-600 hover:underline"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
        <div className="bg-mono-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6 text-mono-900">
            Trust & Safety
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <Shield className="h-6 w-6 text-accent-500" />
              </div>
              <p className="text-sm text-mono-700">Data Security</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <Lock className="h-6 w-6 text-accent-500" />
              </div>
              <p className="text-sm text-mono-700">Enterprise Security</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <CheckCircle2 className="h-6 w-6 text-accent-500" />
              </div>
              <p className="text-sm text-mono-700">Secure Stripe payment</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                <RefreshCw className="h-6 w-6 text-accent-500" />
              </div>
              <p className="text-sm text-mono-700">
                Cancel anytime, 30-day refund
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 mb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-mono-900">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="space-y-4">
          {faqItems.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <span className="text-left font-medium text-mono-800 text-sm">
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-0 text-mono-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
        <div className="bg-accent-50 border border-accent-200 rounded-2xl p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-mono-900">
            See how your brand performs in AI
          </h2>
          <p className="text-lg text-mono-600 mb-8 max-w-2xl mx-auto">
            Subscribe today and unlock valuable insights
          </p>
          <Button
            size="lg"
            className="bg-accent-500 hover:bg-accent-600 text-white px-8"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Feature Example Dialog */}
      <FeatureExampleDialog
        open={featureDialogOpen}
        featureId={selectedFeature}
        onOpenChange={setFeatureDialogOpen}
      />
    </div>
  );
}
