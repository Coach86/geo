export interface StaticPlan {
  name: string;
  badge: string | null;
  badgeColor: string;
  tagline: string;
  tagBgColor: string;
  tagTextColor: string;
  description: string;
  price: string;
  pricePeriod: string;
  savings: number | null;
  features: string[];
  included: string[];
  ctaText: string;
  ctaColor: string;
  checkColor: string;
  plusColor: string;
  isPopular: boolean;
  billedAnnually: boolean;
}

export const staticPlans: StaticPlan[] = [
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
    ctaColor: "bg-purple-600 hover:bg-purple-700",
    checkColor: "text-purple-500",
    plusColor: "text-purple-500",
    isPopular: false,
    billedAnnually: false,
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
    ctaColor: "bg-teal-600 hover:bg-teal-700",
    checkColor: "text-teal-500",
    plusColor: "text-teal-500",
    isPopular: false,
    billedAnnually: false,
  },
];