"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Plus,
  Phone,
  ArrowRight,
} from "lucide-react";

interface PricingCardProps {
  name: string;
  tag: string;
  subtitle: string;
  included: string[];
  price: string;
  pricePeriod: string;
  billedAnnually?: boolean;
  savings?: number | null;
  isRecommended?: boolean;
  isMostPopular?: boolean;
  ctaText: string;
  ctaAction: () => void;
  ctaColor: string;
  checkColor: string;
  plusColor: string;
  isSubmitting?: boolean;
  selectedPlan?: string;
  previousPlanName?: string;
  tagBgColor?: string;
  tagTextColor?: string;
}

export function PricingCard({
  name,
  tag,
  subtitle,
  included,
  price,
  pricePeriod,
  billedAnnually,
  savings,
  isRecommended,
  isMostPopular,
  ctaText,
  ctaAction,
  ctaColor,
  checkColor,
  plusColor,
  isSubmitting,
  selectedPlan,
  previousPlanName,
  tagBgColor = "bg-gray-100",
  tagTextColor = "text-gray-600",
}: PricingCardProps) {
  const showPlusIcon = previousPlanName !== undefined;

  return (
    <div
      className={`relative rounded-xl border ${
        isRecommended
          ? "border-2 border-accent-500 bg-accent-50/20"
          : isMostPopular
          ? "border-2 border-accent-300 bg-gray-50"
          : "border-gray-200 bg-white"
      } shadow-md hover:shadow-lg transition-all duration-300 ${
        isRecommended ? "transform hover:-translate-y-1" : ""
      } h-full`}
    >
      {/* Badges */}
      {isMostPopular && !isRecommended && (
        <div
          className="absolute -top-3 left-4 px-3 py-1 text-white text-xs font-medium rounded-full shadow-sm z-10"
          style={{ backgroundColor: "#6366f1" }}
        >
          Most Popular
        </div>
      )}

      {isRecommended && (
        <div className="absolute -top-3 left-4 px-3 py-1 text-white text-xs font-medium rounded-full shadow-sm z-10 bg-accent-500">
          Recommended for You
        </div>
      )}

      <div className="p-6 flex flex-col h-full">
        {/* Section 1: Plan Header - Dynamic height with min-height */}
        <div className="mb-4 min-h-[100px] flex flex-col">
          <div className="flex items-center mb-1">
            <h3 className="text-xl font-bold text-mono-900">{name}</h3>
          </div>
          <div className="mb-2">
            <span
              className={`text-xs font-medium ${tagTextColor} ${tagBgColor} px-2 py-0.5 rounded-full`}
            >
              {tag}
            </span>
          </div>
          <p className="text-sm font-medium text-mono-700 mt-2">{subtitle}</p>
        </div>

        {/* Section 2: Price - Dynamic height */}
        <div className="pb-4 border-b border-mono-100 mb-4 min-h-[60px]">
          <div>
            <div className="flex items-baseline">
              <span
                className={`${
                  price === "Contact Us" ? "text-xl" : "text-3xl"
                } font-bold text-mono-900`}
              >
                {price}
              </span>
              {pricePeriod && (
                <span className="text-mono-500 ml-1 text-sm">
                  {pricePeriod}
                </span>
              )}
              {billedAnnually && (
                <span className="text-mono-500 ml-2 text-xs">
                  billed annually
                </span>
              )}
            </div>
            {savings && (
              <div className="mt-1 text-xs text-green-600 font-medium flex items-center">
                <ArrowRight className="h-3 w-3 mr-1 rotate-45" />
                Save €{savings} per year
              </div>
            )}
          </div>
        </div>

        {/* Section 3: What's included - Dynamic height, grows with content */}
        <div className="mb-4 flex-grow">
          <h4 className="text-sm font-medium mb-4">
            {showPlusIcon && previousPlanName && (
              <span
                className={`${
                  tagBgColor || "bg-gray-100"
                } ${
                  tagTextColor || "text-gray-700"
                } px-2 py-1 rounded-md inline-block mb-1`}
              >
                Everything in {previousPlanName}, plus
              </span>
            )}
            {!showPlusIcon && (
              <span className="text-mono-700">What's included</span>
            )}
          </h4>
          <ul className="space-y-3">
            {included.map((item, i) => (
              <li key={i} className="flex items-start">
                {!showPlusIcon ? (
                  <Check
                    className={`h-4 w-4 ${checkColor} mr-2 mt-0.5 flex-shrink-0`}
                  />
                ) : (
                  <Plus
                    className={`h-4 w-4 ${plusColor} mr-2 mt-0.5 flex-shrink-0`}
                  />
                )}
                <span className="text-sm text-mono-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section 5: CTA Button - Dynamic height */}
        <div className="mt-auto pt-8">
          <Button
            className={`w-full ${
              isRecommended
                ? "bg-accent-500 hover:bg-accent-600 text-white ring-2 ring-accent-300 ring-offset-2"
                : ctaColor
            } text-white h-11`}
            onClick={ctaAction}
            disabled={isSubmitting && selectedPlan === name.toLowerCase()}
          >
            {isSubmitting && selectedPlan === name.toLowerCase() ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                {ctaText === "Contact Sales" && (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                {ctaText}
              </>
            )}
          </Button>
          {ctaText === "Get Started" && (
            <p className="text-xs text-center text-mono-500 mt-2">
              Cancel anytime
            </p>
          )}
          {ctaText === "Start Free" && (
            <p className="text-xs text-center text-transparent mt-2">
              &nbsp;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}