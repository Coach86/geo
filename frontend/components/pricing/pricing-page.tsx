"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/providers/onboarding-provider";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { FeatureExampleDialog } from "@/components/shared/dialogs/feature-example-dialog";
import { PricingCard } from "@/components/pricing/pricing-card";
import { usePlans } from "@/hooks/use-plans";
import { redirectToStripeCheckout } from "@/lib/stripe-utils";
import { useAuth } from "@/providers/auth-provider";
import { FaqSection } from "./faq-section";
import { calculateSavings } from "./pricing-utils";
import { 
  trustSafetyItems
} from "./pricing-constants";
import { staticPlans } from "./static-plans";

interface PricingPageProps {
  forcedRecommendedPlan?: string;
}

export default function PricingPage({
  forcedRecommendedPlan,
}: PricingPageProps) {
  const router = useRouter();
  const { formData } = useOnboarding();
  const { plans, loading, error } = usePlans();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Ensure data is loaded from localStorage
  useEffect(() => {
    // Check if we have data
    const hasData =
      formData.markets.length > 0 ||
      !!formData.website ||
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

  // Set the selected plan to growth by default
  const [selectedPlan, setSelectedPlan] = useState<
    "starter" | "growth" | "enterprise" | "agencies"
  >("growth");

  const handleStartTrial = async (
    planId: string | undefined,
    planName: string
  ) => {
    setSelectedPlan(planName.toLowerCase() as any);
    setIsSubmitting(true);

    // Handle contact sales for Enterprise/Agencies
    if (planName === "Enterprise" || planName === "Agencies") {
      window.location.href = `mailto:contact@getmint.ai?subject=${planName} Plan Inquiry`;
      setIsSubmitting(false);
      return;
    }

    if (!planId) {
      console.error("Plan ID is required for subscription plans");
      setIsSubmitting(false);
      return;
    }

    // Get userId - if not authenticated, redirect to login
    if (!user?.id) {
      router.push("/auth/login");
      return;
    }

    try {
      // Create checkout session with user context
      const success = await redirectToStripeCheckout({
        planId: planId,
        userId: user.id,
        billingPeriod: billingPeriod,
      });

      if (!success) {
        console.error("Failed to create checkout session for plan:", planName);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      setIsSubmitting(false);
    }
  };

  const handleFeatureClick = (featureId: string) => {
    setSelectedFeature(featureId);
    setFeatureDialogOpen(true);
  };

  // Dynamic pricing plans from API
  const dynamicPlans = plans.slice(0, 2).map((plan, index) => {
    const monthlyPrice = plan.prices?.monthly || 0;
    const yearlyPrice = plan.prices?.yearly || 0;
    const currentPrice =
      billingPeriod === "monthly" ? monthlyPrice : yearlyPrice;
    const savingsAmount =
      billingPeriod === "yearly" ? calculateSavings(monthlyPrice).amount : null;

    return {
      name: plan.name,
      badge: plan.isMostPopular ? "Most Popular" : null,
      badgeColor: plan.isMostPopular ? "#6366f1" : "",
      tagline: plan.tag,
      tagBgColor: index === 0 ? "bg-gray-100" : "bg-accent-100",
      tagTextColor: index === 0 ? "text-gray-600" : "text-accent-700",
      description: plan.subtitle,
      price: `€${currentPrice}`,
      pricePeriod: "/mo",
      billedAnnually: billingPeriod === "yearly",
      savings: savingsAmount,
      features: plan.features,
      included: plan.included,
      ctaText: "Get Started",
      ctaAction: () => handleStartTrial(plan.id, plan.name),
      ctaColor:
        index === 0
          ? "bg-gray-800 hover:bg-gray-900"
          : "bg-accent-500 hover:bg-accent-600",
      checkColor: index === 0 ? "text-green-500" : "text-accent-500",
      plusColor: index === 0 ? "" : "text-accent-500",
      isPopular: plan.isMostPopular,
      isRecommended: plan.isRecommended,
    };
  });

  // Combine dynamic and static plans
  const staticPlansWithActions = staticPlans.map(plan => ({
    ...plan,
    ctaAction: () => handleStartTrial(undefined, plan.name),
  }));
  const pricingPlans = loading ? [] : [...dynamicPlans, ...staticPlansWithActions];

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">
          Failed to load pricing plans. Please try again later.
        </p>
      </div>
    );
  }

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.slice(0, 3).map((plan, index) => (
              <PricingCard
                key={index}
                name={plan.name}
                tag={plan.tagline}
                subtitle={plan.description}
                features={plan.features}
                included={plan.included}
                price={plan.price}
                pricePeriod={plan.pricePeriod}
                billedAnnually={plan.billedAnnually}
                savings={plan.savings}
                isRecommended={false}
                isMostPopular={plan.isPopular}
                ctaText={plan.ctaText}
                ctaAction={plan.ctaAction}
                ctaColor={plan.ctaColor}
                checkColor={plan.checkColor}
                plusColor={plan.plusColor}
                isSubmitting={isSubmitting}
                selectedPlan={selectedPlan}
                previousPlanName={
                  index > 0 ? pricingPlans[index - 1].name : undefined
                }
                tagBgColor={plan.tagBgColor}
                tagTextColor={plan.tagTextColor}
              />
            ))}
          </div>

          {/* Agencies Plan - Séparé et avec un fond différent */}
          <div className="md:col-span-1 flex">
            {pricingPlans[3] && (
              <PricingCard
                name={pricingPlans[3].name}
                tag={pricingPlans[3].tagline}
                subtitle={pricingPlans[3].description}
                features={pricingPlans[3].features}
                included={pricingPlans[3].included}
                price={pricingPlans[3].price}
                pricePeriod={pricingPlans[3].pricePeriod}
                billedAnnually={pricingPlans[3].billedAnnually}
                savings={pricingPlans[3].savings}
                isRecommended={false}
                isMostPopular={pricingPlans[3].isPopular}
                ctaText={pricingPlans[3].ctaText}
                ctaAction={pricingPlans[3].ctaAction}
                ctaColor={pricingPlans[3].ctaColor}
                checkColor={pricingPlans[3].checkColor}
                plusColor={pricingPlans[3].plusColor}
                isSubmitting={isSubmitting}
                selectedPlan={selectedPlan}
                previousPlanName="Growth"
                tagBgColor={pricingPlans[3].tagBgColor}
                tagTextColor={pricingPlans[3].tagTextColor}
              />
            )}
          </div>
        </div>
      </section>


      {/* Trust & Safety Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
        <div className="bg-mono-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6 text-mono-900">
            Trust & Safety
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustSafetyItems.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-full mb-3 shadow-sm">
                  {item.icon}
                </div>
                <p className="text-sm text-mono-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <FaqSection />


      {/* Feature Example Dialog */}
      <FeatureExampleDialog
        open={featureDialogOpen}
        feature={selectedFeature || ''}
        onOpenChange={setFeatureDialogOpen}
      />
    </div>
  );
}
