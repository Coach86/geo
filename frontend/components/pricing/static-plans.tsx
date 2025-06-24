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
    name: "Free",
    badge: null,
    badgeColor: "",
    tagline: "Get started",
    tagBgColor: "bg-green-50",
    tagTextColor: "text-green-700",
    description: "Perfect for exploring AI brand insights",
    price: "€0",
    pricePeriod: "/mo",
    savings: null,
    included: [
      "1 project",
      "1 URL",
      "1 market/language",
      "Visibility insights only",
      "3 AI models",
      "Weekly reports",
      "Community support",
    ],
    ctaText: "Start Free",
    ctaColor: "bg-gray-600 hover:bg-gray-700",
    checkColor: "text-green-500",
    plusColor: "text-green-500",
    isPopular: false,
    billedAnnually: false,
  },
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
    included: [
      "Monitor 15+ brands globally or unlimited for agencies",
      "Custom prompts, personas, and white-label options",
      "SSO, API access (beta), and dedicated support",
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
