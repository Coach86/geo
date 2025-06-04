import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  ArrowLeft, 
  Info, 
  AlertCircle 
} from "lucide-react";
import { OnboardingData } from "@/providers/onboarding-provider";

interface RequirementsCalculatorProps {
  formData: OnboardingData;
  recommendedPlan: string;
  onBackToOnboarding: () => void;
  isDataLoaded: boolean;
}

export interface UserRequirements {
  urlCount: number;
  marketCount: number;
  languageCount: number;
  modelCount: number;
  competitorCount: number;
  promptCount: number;
}

export function calculateUserRequirements(formData: OnboardingData): UserRequirements {
  const urlCount = formData.website ? 1 : 0;
  const marketCount = formData.markets ? formData.markets.length : 0;
  const languageCount = formData.markets
    ? formData.markets.reduce(
        (sum, market) => sum + (market.languages?.length || 0),
        0
      )
    : 0;
  const modelCount = formData.llmModels
    ? formData.llmModels.filter((model) => model.selected).length
    : 0;
  const competitorCount = formData.competitors
    ? formData.competitors.filter((comp) => comp.selected).length
    : 0;
  const promptCount =
    (formData.visibilityPrompts
      ? formData.visibilityPrompts.filter((p) => p.selected).length
      : 0) +
    (formData.perceptionPrompts
      ? formData.perceptionPrompts.filter((p) => p.selected).length
      : 0);

  return {
    urlCount,
    marketCount,
    languageCount,
    modelCount,
    competitorCount,
    promptCount,
  };
}

export function getRecommendedPlan(
  requirements: UserRequirements,
  forcedRecommendedPlan?: string
): string {
  if (forcedRecommendedPlan) {
    return forcedRecommendedPlan;
  }

  const {
    urlCount,
    marketCount,
    languageCount,
    modelCount,
    competitorCount,
    promptCount,
  } = requirements;

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
}

export function getRecommendationReason(
  recommendedPlan: string,
  requirements: UserRequirements,
  forcedRecommendedPlan?: string
): string {
  if (forcedRecommendedPlan) {
    return "Based on your requirements from the onboarding process";
  }

  const {
    urlCount,
    marketCount,
    languageCount,
    modelCount,
    competitorCount,
    promptCount,
  } = requirements;

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
}

export function RequirementsCalculator({
  formData,
  recommendedPlan,
  onBackToOnboarding,
  isDataLoaded,
}: RequirementsCalculatorProps) {
  const requirements = calculateUserRequirements(formData);
  const {
    urlCount,
    marketCount,
    languageCount,
    modelCount,
    competitorCount,
    promptCount,
  } = requirements;

  const recommendationReason = getRecommendationReason(
    recommendedPlan,
    requirements
  );

  const getLimit = (metric: string) => {
    switch (metric) {
      case "urls":
        return recommendedPlan === "starter"
          ? "1"
          : recommendedPlan === "growth"
          ? "3"
          : "15+";
      case "markets":
        return recommendedPlan === "starter"
          ? "1"
          : recommendedPlan === "growth"
          ? "3 per URL"
          : "Unlimited";
      case "languages":
        return recommendedPlan === "starter"
          ? "1"
          : recommendedPlan === "growth"
          ? "3 per market"
          : "Unlimited";
      case "models":
        return recommendedPlan === "starter"
          ? "5"
          : recommendedPlan === "growth"
          ? "8+"
          : "All";
      case "competitors":
        return recommendedPlan === "starter"
          ? "2"
          : recommendedPlan === "growth"
          ? "5"
          : "Unlimited";
      case "prompts":
        return recommendedPlan === "starter"
          ? "50"
          : recommendedPlan === "growth"
          ? "100"
          : "Unlimited";
      default:
        return "";
    }
  };

  return (
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
          <RequirementCard
            label="URLs"
            value={urlCount || 1}
            limit={getLimit("urls")}
            isOverLimit={urlCount > 1}
          />
          <RequirementCard
            label="Markets"
            value={marketCount || 1}
            limit={getLimit("markets")}
            isOverLimit={marketCount > 3}
          />
          <RequirementCard
            label="Languages"
            value={languageCount || 1}
            limit={getLimit("languages")}
            isOverLimit={languageCount > 5}
          />
          <RequirementCard
            label="AI Models"
            value={modelCount || 1}
            limit={getLimit("models")}
            isOverLimit={modelCount > 5}
          />
          <RequirementCard
            label="Competitors"
            value={competitorCount || 0}
            limit={getLimit("competitors")}
            isOverLimit={competitorCount > 2}
          />
          <RequirementCard
            label="Prompts"
            value={promptCount || 0}
            limit={getLimit("prompts")}
            isOverLimit={promptCount > 50}
          />
        </div>

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
              {recommendationReason}
            </p>
            <p className="text-xs text-accent-600 mt-1">
              {getDetailedRecommendationText(recommendedPlan, requirements)}
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button
            variant="link"
            size="sm"
            className="text-accent-600"
            onClick={onBackToOnboarding}
          >
            <ArrowLeft className="h-3 w-3 mr-1" /> Modify your requirements
          </Button>
        </div>
      </div>
    </section>
  );
}

interface RequirementCardProps {
  label: string;
  value: number;
  limit: string;
  isOverLimit: boolean;
}

function RequirementCard({ label, value, limit, isOverLimit }: RequirementCardProps) {
  return (
    <div
      className={`rounded-lg p-3 ${
        isOverLimit
          ? "bg-accent-50 border border-accent-200"
          : "bg-mono-50"
      }`}
    >
      <p className="text-xs text-mono-500 mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <p className="font-medium">{value}</p>
        {isOverLimit && (
          <ArrowRight className="h-3 w-3 text-accent-500" />
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Limit: {limit}
      </p>
    </div>
  );
}

function getDetailedRecommendationText(
  plan: string,
  requirements: UserRequirements
): string {
  const {
    urlCount,
    marketCount,
    languageCount,
    modelCount,
    competitorCount,
    promptCount,
  } = requirements;

  if (plan === "starter") {
    return "Le plan Starter couvre tous vos besoins actuels.";
  } else if (plan === "growth") {
    const reasons = [];
    if (urlCount > 1) reasons.push("Plusieurs URLs nécessitent au moins le plan Growth.");
    if (marketCount > 3) reasons.push("Plus de 3 marchés nécessitent au moins le plan Growth.");
    if (languageCount > 5) reasons.push("Plus de 5 langues nécessitent au moins le plan Growth.");
    if (modelCount > 5) reasons.push("Plus de 5 modèles d'IA nécessitent au moins le plan Growth.");
    if (competitorCount > 2) reasons.push("Plus de 2 concurrents nécessitent au moins le plan Growth.");
    if (promptCount > 50) reasons.push("Plus de 50 prompts nécessitent au moins le plan Growth.");
    return reasons.join(" ");
  } else {
    const reasons = [];
    if (urlCount > 5) reasons.push("Plus de 5 URLs nécessitent au moins le plan Agencies.");
    if (marketCount > 9) reasons.push("Plus de 9 marchés nécessitent au moins le plan Agencies.");
    if (languageCount > 15) reasons.push("Plus de 15 langues nécessitent au moins le plan Agencies.");
    if (modelCount > 10) reasons.push("Plus de 10 modèles d'IA nécessitent au moins le plan Agencies.");
    if (competitorCount > 5) reasons.push("Plus de 5 concurrents nécessitent au moins le plan Agencies.");
    if (promptCount > 100) reasons.push("Plus de 100 prompts nécessitent au moins le plan Agencies.");
    return reasons.join(" ");
  }
}