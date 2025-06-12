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
    name: "For Enterprise & Agencies",
    badge: null,
    badgeColor: "",
    tagline: "For enterprises & agencies",
    tagBgColor: "bg-purple-50",
    tagTextColor: "text-purple-700",
    description: "Tailored solutions for your specific needs",
    price: "Contact Us",
    pricePeriod: "",
    savings: null,
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
    ctaText: "Contact Sales",
    ctaColor: "bg-purple-600 hover:bg-purple-700",
    checkColor: "text-purple-500",
    plusColor: "text-purple-500",
    isPopular: false,
    billedAnnually: false,
  },
];
