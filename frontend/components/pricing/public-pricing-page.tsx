"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingData } from "@/lib/onboarding-storage";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { FeatureExampleDialog } from "@/components/shared/dialogs/feature-example-dialog";
import { ContactSalesDialog } from "@/components/shared/ContactSalesDialog";
import { PricingCard } from "@/components/pricing/pricing-card";
import { usePlans } from "@/hooks/use-plans";
import { FaqSection } from "./faq-section";
import { calculateSavings } from "./pricing-utils";
import {
  trustSafetyItems
} from "./pricing-constants";
import { staticPlans } from "./static-plans";

interface PublicPricingPageProps {
  forcedRecommendedPlan?: string;
}

export default function PublicPricingPage({
  forcedRecommendedPlan,
}: PublicPricingPageProps) {
  const router = useRouter();
  const { plans, loading, error } = usePlans();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [contactSalesOpen, setContactSalesOpen] = useState(false);
  const [contactPlanName, setContactPlanName] = useState<string>("");

  // Ensure data is loaded from localStorage
  useEffect(() => {
    // Get data from localStorage
    const formData = getOnboardingData();

    // Check if we have data
    const hasData =
      (formData.brand?.markets?.length > 0) ||
      !!formData.project?.website ||
      (formData.prompts?.llmModels?.some((m: any) => m.selected));
    setIsDataLoaded(hasData);

    // Log data for debugging
    console.log("Onboarding data in pricing page:", {
      website: formData.project?.website,
      markets: formData.brand?.markets,
      modelCount: formData.prompts?.llmModels?.filter((m: any) => m.selected).length || 0,
      competitorCount: formData.brand?.competitors?.filter((c: any) => c.selected).length || 0,
    });
  }, []);

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

    // Handle contact sales for Enterprise & Agencies plan
    if (planName === "For Enterprise & Agencies" || planName === "Custom" || planName === "Enterprise" || planName === "Agencies") {
      setContactPlanName(planName);
      setContactSalesOpen(true);
      setIsSubmitting(false);
      return;
    }

    // For all other plans, redirect to home page instead of Stripe
    router.push("/");
  };

  const handleFeatureClick = (featureId: string) => {
    setSelectedFeature(featureId);
    setFeatureDialogOpen(true);
  };

  // Dynamic pricing plans from API
  const dynamicPlans = plans.map((plan, index) => {
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
      tagBgColor: index === 0 ? "bg-gray-100" : index === 1 ? "bg-accent-100" : "bg-blue-100",
      tagTextColor: index === 0 ? "text-gray-600" : index === 1 ? "text-accent-700" : "text-blue-700",
      description: plan.subtitle,
      price: `€${currentPrice}`,
      pricePeriod: "/mo",
      billedAnnually: billingPeriod === "yearly",
      savings: savingsAmount,
      included: plan.included,
      ctaText: "Get Started",
      ctaAction: () => handleStartTrial(plan.id, plan.name),
      ctaColor:
        index === 0
          ? "bg-gray-800 hover:bg-gray-900"
          : index === 1
          ? "bg-accent-500 hover:bg-accent-600"
          : "bg-blue-600 hover:bg-blue-700",
      checkColor: index === 0 ? "text-green-500" : index === 1 ? "text-accent-500" : "text-blue-500",
      plusColor: index === 0 ? "" : index === 1 ? "text-accent-500" : "text-blue-500",
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

      {/* Pricing Plan Cards - Dynamic grid structure */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={index}
              name={plan.name}
              tag={plan.tagline}
              subtitle={plan.description}
              included={plan.included}
              price={plan.price}
              pricePeriod={plan.pricePeriod}
              billedAnnually={plan.billedAnnually}
              savings={plan.savings}
              isRecommended={plan.isRecommended || false}
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

      {/* Contact Sales Dialog */}
      <ContactSalesDialog
        open={contactSalesOpen}
        onOpenChange={setContactSalesOpen}
        planName={contactPlanName}
      />
    </div>
  );
}