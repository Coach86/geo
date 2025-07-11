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
import { redirectToStripeCheckout } from "@/lib/stripe-utils";
import { useAuth } from "@/providers/auth-provider";
import { calculateSavings } from "./pricing-utils";
import {
  trustSafetyItems
} from "./pricing-constants";
import { staticPlans } from "./static-plans";
import { getUserProjects, activateFreePlan, getPromoInfo } from "@/lib/auth-api";
import { toast } from "@/hooks/use-toast";
import { PricingHeader } from "@/components/shared/pricing-header";

interface PricingPageProps {
  forcedRecommendedPlan?: string;
}

export default function PricingPage({
  forcedRecommendedPlan,
}: PricingPageProps) {
  const router = useRouter();
  const { plans, loading, error } = usePlans();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [contactSalesOpen, setContactSalesOpen] = useState(false);
  const [contactPlanName, setContactPlanName] = useState<string>("");
  const [hasPromoCode, setHasPromoCode] = useState(false);
  const [promoDetails, setPromoDetails] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    trialPlanId?: string;
    validPlanIds?: string[];
  } | null>(null);

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

    // Check for promo code
    const promoCode = localStorage.getItem("promoCode");
    setHasPromoCode(!!promoCode);

    // Log data for debugging
    console.log("Onboarding data in pricing page:", {
      website: formData.project?.website,
      markets: formData.brand?.markets,
      modelCount: formData.prompts?.llmModels?.filter((m: any) => m.selected).length || 0,
      competitorCount: formData.brand?.competitors?.filter((c: any) => c.selected).length || 0,
      hasPromoCode: !!promoCode,
    });
  }, []);

  // Fetch promo code details if user is authenticated
  useEffect(() => {
    const fetchPromoInfo = async () => {
      if (user?.token) {
        try {
          const promoInfo = await getPromoInfo(user.token);
          console.log("Promo info from API:", promoInfo);
          
          // If organization has a promo code stored, hide free plan even if validation fails
          if (promoInfo.promoCode) {
            setHasPromoCode(true);
            
            // Only set promo details if validation passed
            if (promoInfo.hasPromoCode && promoInfo.promoDetails) {
              setPromoDetails({
                code: promoInfo.promoCode,
                ...promoInfo.promoDetails
              });
            } else {
              console.warn("Promo code stored but validation failed:", promoInfo.validationError || "Unknown error");
            }
          }
        } catch (error) {
          console.error("Failed to fetch promo info:", error);
        }
      }
    };
    
    fetchPromoInfo();
  }, [user]);

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

    // Handle free plan
    if (planName.toLowerCase() === "free") {
      // Get userId - if not authenticated, redirect to login
      if (!user?.id) {
        router.push("/auth/login");
        return;
      }
      
      // Check if user already has projects
      try {
        const projects = await getUserProjects(user.token!);
        
        if (projects && projects.length > 0) {
          // User already has projects, activate free plan and trigger batch processing
          try {
            const result = await activateFreePlan(user.token!);
            
            if (result.success) {
              // Show success message
              toast({
                title: "Free Plan Activated",
                description: "Your visibility analysis is being prepared. You'll be redirected to your dashboard.",
                variant: "success" as any,
                duration: 5000,
              });
              
              // Set celebration flag and redirect to home after a short delay
              sessionStorage.setItem('celebrate_plan_activation', 'true');
              setTimeout(() => {
                router.push("/home?plan_activated=true");
              }, 2000);
            } else {
              // Handle case where free plan was already activated
              toast({
                title: "Already Activated",
                description: result.message || "Free plan has already been activated.",
                variant: "default" as any,
                duration: 5000,
              });
              
              // Still redirect to dashboard
              setTimeout(() => {
                router.push("/");
              }, 2000);
            }
          } catch (error) {
            console.error("Failed to activate free plan:", error);
            toast({
              title: "Activation Failed",
              description: "Failed to activate free plan. Please try again.",
              variant: "destructive" as any,
              duration: 5000,
            });
          }
        } else {
          // No projects yet, redirect to onboarding
          router.push("/onboarding");
        }
      } catch (error) {
        console.error("Failed to check user projects:", error);
        // Default to onboarding on error
        router.push("/onboarding");
      }
      
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

  // Check if any plan has a promo code
  const planWithPromo = promoDetails && promoDetails.discountType === 'trial_days' ? 
    plans.find(plan => promoDetails.trialPlanId === plan.id) : null;

  // Dynamic pricing plans from API
  const dynamicPlans = plans.map((plan, index) => {
    const monthlyPrice = plan.prices?.monthly || 0;
    const yearlyPrice = plan.prices?.yearly || 0;
    const currentPrice =
      billingPeriod === "monthly" ? Math.round(monthlyPrice) : Math.round(yearlyPrice / 12);
    const savingsAmount =
      billingPeriod === "yearly" ? calculateSavings(monthlyPrice).amount : null;

    // Check if this plan has a promo code applied
    let promoInfo = null;
    if (promoDetails && promoDetails.discountType === 'trial_days') {
      // For trial_days type, use trialPlanId to determine which plan gets the trial
      const isValidForPlan = promoDetails.trialPlanId === plan.id;
      
      if (isValidForPlan) {
        promoInfo = {
          code: promoDetails.code,
          trialDays: promoDetails.discountValue,
        };
      }
    }

    // Determine if this plan should be recommended
    let isRecommended;
    if (planWithPromo) {
      // If there's a plan with promo, only that plan is recommended
      isRecommended = promoInfo ? true : false;
    } else {
      // Otherwise use the default recommendation
      isRecommended = plan.isRecommended;
    }

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
      ctaText: promoInfo ? `${promoInfo.trialDays} days free trial` : "Get Started",
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
      isRecommended: isRecommended,
      promoInfo: promoInfo,
    };
  });

  // Combine dynamic and static plans
  const staticPlansWithActions = staticPlans.map(plan => ({
    ...plan,
    ctaAction: () => handleStartTrial(undefined, plan.name),
  }));
  
  // Separate plans
  const freePlan = staticPlansWithActions.find(p => p.name.toLowerCase() === 'free');
  const enterprisePlan = staticPlansWithActions.find(p => p.name.toLowerCase().includes('enterprise') || p.name.toLowerCase().includes('agencies'));
  
  // Regular pricing plans (excluding enterprise)
  // Hide free plan if promo code is present
  const pricingPlans = loading ? [] : [
    ...(freePlan && !hasPromoCode ? [freePlan] : []),
    ...dynamicPlans
  ];

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
    <div className="min-h-screen bg-white">
      <PricingHeader />
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch ${
          pricingPlans.length === 3 
            ? "lg:grid-cols-3 max-w-5xl mx-auto" 
            : "lg:grid-cols-4"
        }`}>
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
              promoInfo={plan.promoInfo}
            />
          ))}
        </div>
      </section>

      {/* Enterprise Plan - Horizontal Card */}
      {enterprisePlan && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
          <div className="bg-purple-50 rounded-2xl p-8 border border-purple-100">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {enterprisePlan.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {enterprisePlan.description}
                </p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-gray-700">
                  {enterprisePlan.included.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={enterprisePlan.ctaAction}
                  size="lg"
                  className={enterprisePlan.ctaColor}
                  disabled={isSubmitting}
                >
                  {enterprisePlan.ctaText}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}


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
    </div>
  );
}
