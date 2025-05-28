"use client";

import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Search,
  FileText,
  Users,
  MessageSquare,
  Brain,
  Shield,
} from "lucide-react";

const geoCategories = [
  {
    id: "content",
    title: "Content Structure & Format",
    icon: FileText,
    color: "bg-blue-50 text-blue-700",
    recommendations: [
      {
        title: "Use Question-and-Answer Format",
        description:
          "Structure content as clear Q&A pairs that directly address user queries, making it easier for AI engines to extract and cite.",
        impact: "High",
        difficulty: "Easy",
        tips: [
          "Start with common questions your audience asks",
          "Provide concise, direct answers (50-150 words)",
          "Use H2/H3 headings for questions",
          "Include follow-up questions for comprehensive coverage",
        ],
      },
      {
        title: "Create Hierarchical Content Structure",
        description:
          "Organize content with clear headings, subheadings, and logical flow to help AI engines understand context and relationships.",
        impact: "High",
        difficulty: "Easy",
        tips: [
          "Use H1 for main topics, H2 for subtopics, H3 for details",
          "Maintain consistent heading hierarchy",
          "Include table of contents for long articles",
          "Use numbered and bulleted lists for clarity",
        ],
      },
      {
        title: "Write in Clear, Concise Language",
        description:
          "Use simple, direct language that AI engines can easily parse and understand for accurate citations.",
        impact: "Medium",
        difficulty: "Easy",
        tips: [
          "Avoid jargon and complex terminology",
          "Use short sentences (15-20 words max)",
          "Write in active voice",
          "Define technical terms when first introduced",
        ],
      },
    ],
  },
  {
    id: "authority",
    title: "Authority & Credibility",
    icon: Shield,
    color: "bg-green-50 text-green-700",
    recommendations: [
      {
        title: "Include Verifiable Citations",
        description:
          "Add credible sources, statistics, and references that AI engines can validate and use to establish content authority.",
        impact: "High",
        difficulty: "Medium",
        tips: [
          "Link to authoritative sources (academic papers, government data)",
          "Include publication dates for all citations",
          "Use proper citation formats",
          "Verify all facts and figures before publication",
        ],
      },
      {
        title: "Maintain Objective, Expert Tone",
        description:
          "Write from an authoritative perspective with balanced, fact-based content that demonstrates expertise.",
        impact: "High",
        difficulty: "Medium",
        tips: [
          "Avoid promotional or biased language",
          "Present multiple viewpoints when relevant",
          "Use data to support claims",
          "Showcase expertise through detailed analysis",
        ],
      },
      {
        title: "Provide Concrete Examples",
        description:
          "Include specific, real-world examples that AI engines can reference as practical applications of concepts.",
        impact: "Medium",
        difficulty: "Easy",
        tips: [
          "Use case studies from recognizable companies",
          "Include specific numbers and metrics",
          "Provide step-by-step examples",
          "Show before/after scenarios",
        ],
      },
    ],
  },
  {
    id: "optimization",
    title: "Technical Optimization",
    icon: Search,
    color: "bg-purple-50 text-purple-700",
    recommendations: [
      {
        title: "Implement Semantic Metadata",
        description:
          "Use structured data and schema markup to help AI engines understand content context and relationships.",
        impact: "High",
        difficulty: "Hard",
        tips: [
          "Add JSON-LD structured data",
          "Use appropriate schema.org types",
          "Include breadcrumb markup",
          "Implement FAQ schema for Q&A content",
        ],
      },
      {
        title: "Optimize for Featured Snippets",
        description:
          "Format content to appear in featured snippets, which AI engines often reference and cite.",
        impact: "Medium",
        difficulty: "Medium",
        tips: [
          "Answer questions within first 40-60 words",
          "Use tables for comparison data",
          "Create numbered lists for processes",
          "Include definition paragraphs for key terms",
        ],
      },
      {
        title: "Create Content Clusters",
        description:
          "Build topical authority by creating interconnected content around your expertise areas.",
        impact: "High",
        difficulty: "Hard",
        tips: [
          "Identify core topics in your industry",
          "Create pillar pages for main topics",
          "Link related content strategically",
          "Update clusters regularly with new insights",
        ],
      },
    ],
  },
  {
    id: "freshness",
    title: "Content Freshness & Updates",
    icon: TrendingUp,
    color: "bg-orange-50 text-orange-700",
    recommendations: [
      {
        title: "Regular Content Updates",
        description:
          "Keep content current as AI engines prefer fresh, up-to-date information for citations.",
        impact: "High",
        difficulty: "Medium",
        tips: [
          "Review and update content quarterly",
          "Add new data and statistics regularly",
          "Update examples with current events",
          "Refresh publication dates after major updates",
        ],
      },
      {
        title: "Monitor AI Engine Citations",
        description:
          "Track how often your content is cited by AI engines and optimize based on patterns.",
        impact: "Medium",
        difficulty: "Medium",
        tips: [
          "Set up Google Alerts for your brand mentions",
          "Monitor ChatGPT, Claude, and Perplexity responses",
          "Track which content gets cited most",
          "Analyze competitor citation patterns",
        ],
      },
      {
        title: "Trend-Based Content Creation",
        description:
          "Create content around emerging topics and trends in your industry to capture early AI citations.",
        impact: "Medium",
        difficulty: "Easy",
        tips: [
          "Use Google Trends for topic research",
          "Monitor industry news and reports",
          "Create content around seasonal trends",
          "Address current events in your expertise area",
        ],
      },
    ],
  },
  {
    id: "strategy",
    title: "GEO Strategy & Integration",
    icon: Brain,
    color: "bg-red-50 text-red-700",
    recommendations: [
      {
        title: "Integrate GEO with SEO Strategy",
        description:
          "Combine GEO tactics with traditional SEO for comprehensive search optimization across all engines.",
        impact: "High",
        difficulty: "Medium",
        tips: [
          "Maintain keyword optimization alongside GEO",
          "Create content that works for both humans and AI",
          "Track traditional and AI search performance",
          "Allocate budget between SEO and GEO efforts",
        ],
      },
      {
        title: "Multi-AI Engine Optimization",
        description:
          "Optimize for multiple AI engines (ChatGPT, Claude, Gemini, Perplexity) as they have different preferences.",
        impact: "High",
        difficulty: "Hard",
        tips: [
          "Test content across different AI engines",
          "Understand each engine's citation preferences",
          "Create varied content formats",
          "Monitor performance across all platforms",
        ],
      },
      {
        title: "Human Oversight and Quality Control",
        description:
          "Implement human review processes to ensure GEO content maintains quality and accuracy.",
        impact: "High",
        difficulty: "Medium",
        tips: [
          "Establish editorial guidelines for GEO content",
          "Regular fact-checking processes",
          "Expert review for technical content",
          "User feedback integration for improvements",
        ],
      },
    ],
  },
];

const impactColors = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
};

const difficultyColors = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Hard: "bg-red-100 text-red-800",
};

export default function RecommendationsPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent-100 rounded-lg">
              <Lightbulb className="w-6 h-6 text-accent-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Generative Engine Optimization (GEO)
              </h1>
              <p className="text-gray-600 mt-1">
                Optimize your content for AI-powered search engines like
                ChatGPT, Claude, Gemini, and Perplexity
              </p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>What is GEO?</strong> Generative Engine Optimization is
              the practice of optimizing content to be cited and referenced by
              AI-powered search engines. Unlike traditional SEO, GEO focuses on
              being selected as a trusted source in AI-generated responses.
            </AlertDescription>
          </Alert>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">39%</div>
                  <div className="text-sm text-gray-600">Use AI for Search</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">25%</div>
                  <div className="text-sm text-gray-600">
                    Search Volume at Risk
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">75%</div>
                  <div className="text-sm text-gray-600">
                    Will Adopt GEO by 2025
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">20+</div>
                  <div className="text-sm text-gray-600">
                    Optimization Tactics
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* GEO Recommendations by Category */}
        <div className="space-y-8">
          {geoCategories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className={`${category.color} border-b`}>
                <div className="flex items-center gap-3">
                  <category.icon className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription className="text-current opacity-80">
                      {category.recommendations.length} optimization techniques
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {category.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">
                            {rec.title}
                          </h3>
                          <p className="text-gray-600 mb-3">
                            {rec.description}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Badge
                            className={
                              impactColors[
                                rec.impact as keyof typeof impactColors
                              ]
                            }
                          >
                            {rec.impact} Impact
                          </Badge>
                          <Badge
                            className={
                              difficultyColors[
                                rec.difficulty as keyof typeof difficultyColors
                              ]
                            }
                          >
                            {rec.difficulty}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          Implementation Tips
                        </h4>
                        <ul className="space-y-1">
                          {rec.tips.map((tip, tipIndex) => (
                            <li
                              key={tipIndex}
                              className="text-sm text-gray-600 flex items-start gap-2"
                            >
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
