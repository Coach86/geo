"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { PricingCard } from "@/components/pricing/pricing-card";
import { ContactSalesDialog } from "@/components/shared/ContactSalesDialog";
import { usePlans } from "@/hooks/use-plans";
import { redirectToStripeCheckout } from "@/lib/stripe-utils";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/use-analytics";
import { useEffect } from "react";

export default function UpdatePlanPage() {
  const router = useRouter();
  const { plans, loading, error } = usePlans();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [contactSalesOpen, setContactSalesOpen] = useState(false);
  const [contactPlanName, setContactPlanName] = useState<string>("");

  useEffect(() => {
    // Track plan page view
    analytics.trackPlanViewed('current_plan');
  }, []);

  const handleSelectPlan = async (
    planId: string | undefined,
    planName: string
  ) => {
    setSelectedPlan(planName.toLowerCase());
    setIsSubmitting(true);

    if (planName === "For Enterprise & Agencies" || planName === "Custom" || planName === "Enterprise" || planName === "Agencies") {
      // Open contact sales dialog
      setContactPlanName(planName);
      setContactSalesOpen(true);
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
      // Track plan upgrade started
      analytics.trackPlanUpgradeStarted('current_plan', planName);

      // Create checkout session with user context
      const success = await redirectToStripeCheckout({
        planId: planId,
        userId: user.id,
        billingPeriod: billingPeriod,
      });

      if (!success) {
        console.error("Failed to create checkout session for plan:", planName);
        toast.error("Failed to create payment session.");
        analytics.trackError('checkout_session_failed', `Failed to create checkout for ${planName}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to create payment session.");
      setIsSubmitting(false);
    }
  };

  const calculateSavings = (yearlyPrice: number, monthlyPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const yearlyCost = yearlyPrice;
    const savings = monthlyCost - yearlyCost;
    return {
      amount: savings,
      percentage: Math.round((savings / monthlyCost) * 100),
    };
  };

  // Dynamic pricing plans from API
  const dynamicPlans = plans.map((plan, index) => {
    const monthlyPrice = plan.prices?.monthly || 0;
    const yearlyPrice = plan.prices?.yearly || 0;
    const currentPrice =
      billingPeriod === "monthly" ? monthlyPrice : yearlyPrice;
    const savingsAmount =
      billingPeriod === "yearly" ? calculateSavings(yearlyPrice, monthlyPrice).amount : null;

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
          : index === 1
          ? "bg-accent-500 hover:bg-accent-600"
          : "bg-blue-600 hover:bg-blue-700",
      checkColor: index === 0 ? "text-green-500" : index === 1 ? "text-accent-500" : "text-blue-500",
      plusColor: index === 0 ? "" : index === 1 ? "text-accent-500" : "text-blue-500",
      tagBgColor: index === 0 ? "bg-gray-100" : index === 1 ? "bg-accent-100" : "bg-blue-100",
      tagTextColor: index === 0 ? "text-gray-600" : index === 1 ? "text-accent-700" : "text-blue-700",
    };
  });

  // Static plan for Enterprise & Agencies
  const staticPlans = [
    {
      name: "For Enterprise & Agencies",
      tag: "For enterprises & agencies",
      subtitle: "Tailored solutions for your specific needs",
      features: [
        "Monitor 15+ brands globally or unlimited for agencies",
        "Custom prompts, personas, and white-label options",
        "SSO, API access (beta), and dedicated support",
      ],
      included: [
        "All features from Pro",
        "Custom brand limits",
        "Enterprise features & support",
      ],
      price: "Contact Us",
      pricePeriod: "",
      billedAnnually: false,
      savings: null,
      isMostPopular: false,
      ctaText: "Contact Sales",
      ctaAction: () => handleSelectPlan(undefined, "For Enterprise & Agencies"),
      ctaColor: "bg-purple-600 hover:bg-purple-700",
      checkColor: "text-purple-500",
      plusColor: "text-purple-500",
      tagBgColor: "bg-purple-50",
      tagTextColor: "text-purple-700",
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
            <Button
              variant="link"
              className="text-accent-500 p-0 h-auto"
              onClick={() => {
                setContactPlanName("Plan");
                setContactSalesOpen(true);
              }}
            >
              Contact us
            </Button>
          </p>
          <Button variant="link" onClick={() => router.back()}>
            <Zap className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>

      {/* Contact Sales Dialog */}
      <ContactSalesDialog
        open={contactSalesOpen}
        onOpenChange={setContactSalesOpen}
        planName={contactPlanName}
      />
      </div>
  );
}
