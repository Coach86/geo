import {
  LineChart,
  BarChart,
  Target,
  BarChart3,
  Layers,
  TrendingUp,
  Zap,
  Users,
  ArrowUpRight,
  Shield,
  Lock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export interface CoreFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export interface WhyItMattersPoint {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface ComparisonDataRow {
  feature: string;
  starter: string | boolean;
  growth: string | boolean;
  enterprise: string | boolean;
  agencies: string | boolean;
}

export interface TrustSafetyItem {
  label: string;
  icon: React.ReactNode;
}

export const coreFeatures: CoreFeature[] = [
  {
    id: "pulse",
    name: "Pulse",
    description: "How often AIs mention your brand",
    icon: <LineChart className="h-5 w-5" />,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "tone",
    name: "Tone",
    description: "The sentiment expressed about you",
    icon: <BarChart className="h-5 w-5" />,
    color: "bg-green-50 text-green-600",
  },
  {
    id: "accord",
    name: "Accord",
    description: "Alignment with brand values",
    icon: <Target className="h-5 w-5" />,
    color: "bg-purple-50 text-purple-600",
  },
  {
    id: "arena",
    name: "Arena",
    description: "Your AI visibility vs competitors",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-orange-50 text-orange-600",
  },
  {
    id: "trace",
    name: "Trace",
    description: "What sources AIs rely on",
    icon: <Layers className="h-5 w-5" />,
    color: "bg-pink-50 text-pink-600",
  },
  {
    id: "lift",
    name: "Lift",
    description: "Actions to improve AI presence",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "bg-accent-50 text-accent-600",
  },
];

export const whyItMatters: WhyItMattersPoint[] = [
  {
    title: "AI is becoming the new search",
    description:
      "Millions of users now ask AI models questions instead of searching on Google.",
    icon: <Zap className="h-5 w-5" />,
  },
  {
    title: "Brand perception is evolving",
    description:
      "How AI models describe your brand directly impacts consumer decisions.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Competitive advantage",
    description:
      "Early adopters who optimize for AI visibility gain significant market advantage.",
    icon: <ArrowUpRight className="h-5 w-5" />,
  },
];

export const comparisonData: ComparisonDataRow[] = [
  {
    feature: "URLs included",
    starter: "1",
    growth: "3",
    enterprise: "15",
    agencies: "Unlimited",
  },
  {
    feature: "Markets/Languages",
    starter: "1",
    growth: "3 per URL",
    enterprise: "3 per URL",
    agencies: "Unlimited",
  },
  {
    feature: "Competitors tracked",
    starter: "5 per URL",
    growth: "5 per URL",
    enterprise: "Unlimited",
    agencies: "Unlimited",
  },
  {
    feature: "Spontaneous prompts",
    starter: "Up to 15",
    growth: "Up to 20",
    enterprise: "Unlimited",
    agencies: "Unlimited",
  },
  {
    feature: "AI models",
    starter: "5",
    growth: "8+",
    enterprise: "All",
    agencies: "All + Custom",
  },
  {
    feature: "Refresh frequency",
    starter: "Weekly",
    growth: "Weekly",
    enterprise: "Daily (beta)",
    agencies: "Daily & On demand",
  },
  {
    feature: "CSV Export",
    starter: false,
    growth: true,
    enterprise: true,
    agencies: true,
  },
  {
    feature: "API Access",
    starter: false,
    growth: false,
    enterprise: true,
    agencies: true,
  },
  {
    feature: "Custom prompts",
    starter: false,
    growth: false,
    enterprise: true,
    agencies: true,
  },
  {
    feature: "Custom personas",
    starter: false,
    growth: false,
    enterprise: true,
    agencies: true,
  },
  {
    feature: "White-label portal",
    starter: false,
    growth: false,
    enterprise: false,
    agencies: true,
  },
  {
    feature: "Dedicated CSM",
    starter: false,
    growth: false,
    enterprise: true,
    agencies: true,
  },
];

export const trustSafetyItems: TrustSafetyItem[] = [
  {
    label: "Data Security",
    icon: <Shield className="h-6 w-6 text-accent-500" />,
  },
  {
    label: "Enterprise Security",
    icon: <Lock className="h-6 w-6 text-accent-500" />,
  },
  {
    label: "Secure Stripe payment",
    icon: <CheckCircle2 className="h-6 w-6 text-accent-500" />,
  },
  {
    label: "Cancel anytime, 30-day refund",
    icon: <RefreshCw className="h-6 w-6 text-accent-500" />,
  },
];

export const featureTooltips: Record<string, string> = {
  "URLs included": "Number of websites you can monitor simultaneously",
  "Markets/Languages": "Geographic markets and languages covered per URL",
  "AI models": "Number of AI models used for analysis",
  "Refresh frequency": "How often your data is updated",
  "CSV Export": "Export raw data for further analysis",
  "API Access": "Programmatic access to your data (beta)",
  "Custom prompts": "Create your own prompts for testing",
  "Custom personas": "Create user personas for targeted testing",
  "White-label portal": "Branded dashboard for your clients",
  "Dedicated CSM": "Dedicated Customer Success Manager",
  "Competitors tracked": "Number of competitors you can track",
};