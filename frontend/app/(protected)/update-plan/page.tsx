"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { PricingCard } from "@/components/pricing/pricing-card";
import { usePlans } from "@/hooks/use-plans";
import { redirectToStripeCheckout } from "@/lib/stripe-utils";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export default function UpdatePlanPage() {
  const router = useRouter();
  const { plans, loading, error } = usePlans();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (
    planId: string | undefined,
    planName: string
  ) => {
    setSelectedPlan(planName.toLowerCase());
    setIsSubmitting(true);

    if (planName === "Enterprise" || planName === "Agencies") {
      // Redirect to contact page or open contact modal
      window.location.href = `mailto:contact@getmint.ai?subject=${planName} Plan Inquiry`;
      setIsSubmitting(false);
      return;
    }

    if (!planId) {
      console.error("Plan ID is required for subscription plans");
      toast.error("Plan configuration error.");
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
        toast.error("Failed to create payment session.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to create payment session.");
      setIsSubmitting(false);
    }
  };

  const getYearlyPrice = (monthlyPrice: number) => {
    return Math.round(monthlyPrice * 0.8);
  };

  const calculateSavings = (monthlyPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const yearlyCost = getYearlyPrice(monthlyPrice) * 12;
    const savings = monthlyCost - yearlyCost;
    return {
      amount: savings,
      percentage: Math.round((savings / monthlyCost) * 100),
    };
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
      tag: plan.tag,
      subtitle: plan.subtitle,
      features: plan.features,
      included: plan.included,
      price: `€${currentPrice}`,
      pricePeriod: "/mo",
      billedAnnually: billingPeriod === "yearly",
      savings: savingsAmount,
      isMostPopular: plan.isMostPopular,
      ctaText: "Upgrade to " + plan.name,
      ctaAction: () => handleSelectPlan(plan.id, plan.name),
      ctaColor:
        index === 0
          ? "bg-gray-800 hover:bg-gray-900"
          : "bg-accent-500 hover:bg-accent-600",
      checkColor: index === 0 ? "text-green-500" : "text-accent-500",
      plusColor: index === 0 ? "" : "text-accent-500",
      tagBgColor: index === 0 ? "bg-gray-100" : "bg-accent-100",
      tagTextColor: index === 0 ? "text-gray-600" : "text-accent-700",
    };
  });

  // Static plans for Enterprise and Agencies
  const staticPlans = [
    {
      name: "Enterprise",
      tag: "For global brand teams",
      subtitle: "Global scalability with enterprise-grade support",
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
      price: "Contact Us",
      pricePeriod: "",
      billedAnnually: false,
      savings: null,
      isMostPopular: false,
      ctaText: "Contact Sales",
      ctaAction: () => handleSelectPlan(undefined, "Enterprise"),
      ctaColor: "bg-purple-600 hover:bg-purple-700",
      checkColor: "text-purple-500",
      plusColor: "text-purple-500",
      tagBgColor: "bg-purple-50",
      tagTextColor: "text-purple-700",
    },
    {
      name: "Agencies",
      tag: "For multi-client agencies",
      subtitle: "Custom solutions for multi-client management",
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
      price: "Contact Us",
      pricePeriod: "",
      billedAnnually: false,
      savings: null,
      isMostPopular: false,
      ctaText: "Contact Sales",
      ctaAction: () => handleSelectPlan(undefined, "Agencies"),
      ctaColor: "bg-teal-600 hover:bg-teal-700",
      checkColor: "text-teal-500",
      plusColor: "text-teal-500",
      tagBgColor: "bg-teal-50",
      tagTextColor: "text-teal-700",
    },
  ];

  // Combine dynamic and static plans
  const allPlans = loading ? [] : [...dynamicPlans, ...staticPlans];

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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
          <p className="text-lg text-muted-foreground">
            You've reached your current plan's brand limit. Choose a plan that
            fits your needs.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allPlans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              tag={plan.tag}
              subtitle={plan.subtitle}
              features={plan.features}
              included={plan.included}
              price={plan.price}
              pricePeriod={plan.pricePeriod}
              billedAnnually={plan.billedAnnually}
              savings={plan.savings}
              isRecommended={false}
              isMostPopular={plan.isMostPopular}
              ctaText={plan.ctaText}
              ctaAction={plan.ctaAction}
              ctaColor={plan.ctaColor}
              checkColor={plan.checkColor}
              plusColor={plan.plusColor}
              isSubmitting={isSubmitting}
              selectedPlan={selectedPlan ?? undefined}
              previousPlanName={
                index > 0 ? allPlans[index - 1].name : undefined
              }
              tagBgColor={plan.tagBgColor}
              tagTextColor={plan.tagTextColor}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need help choosing the right plan?{" "}
            <a
              href="mailto:contact@getmint.ai?subject=Plan Inquiry"
              className="text-accent-500"
            >
              Contact us
            </a>
          </p>
          <Button variant="link" onClick={() => router.back()}>
            <Zap className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
  );
}
