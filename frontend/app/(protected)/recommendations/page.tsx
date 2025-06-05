"use client";

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
  Settings,
  BarChart3,
  Globe,
  Award,
} from "lucide-react";

const geoCategories = [
  {
    id: "technical",
    title: "Technical & Structural Essentials",
    icon: Settings,
    color: "bg-blue-50 text-blue-700",
    recommendations: [
      {
        title: "Whitelist Legitimate AI Crawlers",
        description: "Update robots.txt to allow AI crawlers access to your content",
        researchBacking: "Essential prerequisite for AI visibility",
        implementationSteps: [
          "Update robots.txt to allow GPTBot, Google's AI crawler, xxx",
          "Check crawler logs to verify successful access",
          "Test with crawler simulation tools",
          "Monitor for new AI crawlers monthly"
        ],
        impact: "High",
        difficulty: "Easy",
      },
      {
        title: "Clear, Consistent Headings",
        description: "Ensure H1 tags and title tags are aligned for better AI comprehension",
        researchBacking: "80% of cited pages have matching H1 + title tags",
        implementationSteps: [
          "Compare H1 vs. <title> for discrepancies",
          "Align first 80 characters for consistency",
          "Synchronize URL slug with key terms",
          "Submit updated sitemap to accelerate discovery"
        ],
        example: "H1 and title both using \"Best 2025 Trail Running Shoes for Technical Terrain\"",
        impact: "High",
        difficulty: "Easy",
      },
      {
        title: "Frontload Key Insights",
        description: "Place your most important information at the beginning of content",
        researchBacking: "AI systems prioritize content appearing early in the document",
        implementationSteps: [
          "Place TL;DR summaries within first 150 words",
          "Begin with direct answers to primary queries",
          "Use bolded text for key definitions",
          "Test extraction with AI tools"
        ],
        example: "\"Direct Answer: Organic cotton requires 88% less water than conventional cotton according to the 2025 Textile Sustainability Report.\"",
        impact: "High",
        difficulty: "Medium",
      },
      {
        title: "Paragraph Compression",
        description: "Keep paragraphs short and focused for better AI processing",
        researchBacking: "LLM retrieval splits documents into ~200-400 token chunks. Shorter paragraphs with less than 90 words (≈ 120 tokens) facilitate extraction",
        implementationSteps: [
          "Target Hemingway grade ≤8 readability (https://hemingwayapp.com/readability-checker)",
          "Break long content blocks into shorter sections",
          "Add bullet points for key concepts",
          "Re-check readability score post-editing"
        ],
        example: "Convert a 180-word dense paragraph into three 60-word sections with clear topic sentence at start",
        impact: "Medium",
        difficulty: "Medium",
      },
    ],
  },
  {
    id: "content-formats",
    title: "Content Formats & Optimization",
    icon: FileText,
    color: "bg-green-50 text-green-700",
    recommendations: [
      {
        title: "Lists & Tables",
        description: "Use structured formats to improve content extraction",
        researchBacking: "Structured formats increase AI extraction rates by 45%",
        implementationSteps: [
          "Convert paragraph-based comparisons to tables",
          "Use consistent column headers and formatting",
          "Implement proper table markup with <thead> and <tbody>",
          "Include clear caption or summary text"
        ],
        example: "Replace narrative product comparisons with structured comparison tables featuring consistent metrics across all products",
        impact: "High",
        difficulty: "Medium",
      },
      {
        title: "FAQ Schema",
        description: "Implement structured data for question-answer content",
        researchBacking: "FAQ markup and detailed answer ranked as a top tactic and called \"critical for AI agents\"",
        implementationSteps: [
          "Collect People Also Ask (PAA) questions from competitor analysis",
          "Draft concise answers (≤120 characters)",
          "Implement JSON-LD schema with proper formatting",
          "Validate implementation in Google's Rich Results Test"
        ],
        example: "How much does organic certification cost? Organic certification typically costs between $400-$2,000 annually depending on farm size and production volume",
        impact: "High",
        difficulty: "Hard",
      },
      {
        title: "How-To Schema",
        description: "Add structured markup for instructional content",
        researchBacking: "Structured steps boost visibility by 32% for instructional queries",
        implementationSteps: [
          "Write ordered lists with supporting images for each step",
          "Build How-To schema with complete markup",
          "Include totalTime and tool/supply metadata",
          "Test in Google's Rich Results Test"
        ],
        example: "How-To schema for \"Lacing Trail Running Shoes for Steep Descents (6 steps)\"",
        impact: "Medium",
        difficulty: "Hard",
      },
      {
        title: "Embed Semantic Cues",
        description: "Use clear markers to guide AI understanding",
        researchBacking: "Clear signposting improves AI comprehension by 27%",
        implementationSteps: [
          "Use explicit phrase markers (\"Key Takeaway:\", \"In Summary:\")",
          "Apply consistent formatting to cue types",
          "Place cues at strategically important content points",
          "Test extraction with AI summarization tools"
        ],
        example: "\"Key Takeaway: Regenerative agriculture practices can sequester 5-10 tons of carbon per acre annually while improving soil health.\"",
        impact: "Medium",
        difficulty: "Easy",
      },
      {
        title: "Multimedia & Transcripts",
        description: "Provide text alternatives for video and audio content",
        researchBacking: "Adding transcripts lifted inclusion for 2/3 of videos in analysis",
        implementationSteps: [
          "Generate accurate transcripts for video content (e.g. activated for YouTube)",
          "Embed transcript directly below video",
          "Add ClipSchema markup with timestamps",
          "Ping index for recrawling"
        ],
        example: "Full text transcript with timestamps for product demonstration video",
        impact: "High",
        difficulty: "Medium",
      },
    ],
  },
  {
    id: "authoritativeness",
    title: "Authoritativeness & Trust Signals",
    icon: Shield,
    color: "bg-purple-50 text-purple-700",
    recommendations: [
      {
        title: "Primary Statistics",
        description: "Include recent, verifiable data to boost credibility",
        researchBacking: "Fresh statistics lifted AI inclusion by +40% in a 100k-query benchmark",
        implementationSteps: [
          "Source statistics less than 12 months old",
          "Embed inline with citation",
          "Highlight with <strong> tag for visual emphasis",
          "Calendar yearly updates to maintain freshness"
        ],
        example: "\"Organic cotton acreage grew 17% YoY (Textile Exchange 2025), outpacing conventional cotton for the first time.\"",
        impact: "High",
        difficulty: "Medium",
      },
      {
        title: "Expert Quotes",
        description: "Feature authoritative voices to enhance trust",
        researchBacking: "Quotes raise visibility by approximately 25% on informational queries",
        implementationSteps: [
          "Interview credible subject matter experts",
          "Insert ≤40-word blockquotes with attribution",
          "Link to expert bio or credentials",
          "Implement author schema markup"
        ],
        example: "\"> Circularity is the next S-curve in sustainable manufacturing, with potential to reduce waste by 60%. —Dr. Ana Willis, MIT Sustainable Manufacturing Lab\"",
        impact: "High",
        difficulty: "Hard",
      },
      {
        title: "Peer-Reviewed Citations",
        description: "Reference academic and industry sources",
        researchBacking: "52% of AI-Overview sources sit outside Google's top-10 yet carry authoritative references",
        implementationSteps: [
          "Identify pages with low citation factor",
          "Add relevant academic or industry citations (every ~300 words)",
          "Place within first 150 pixels of target keyword",
          "Re-score after 24 hours"
        ],
        example: "\"According to The Lancet (2024), coronary heart disease rates have decreased 12% over the past decade.\"",
        impact: "High",
        difficulty: "Medium",
      },
      {
        title: "Author Credentials (E-E-A-T)",
        description: "Showcase expertise and authority signals",
        researchBacking: "SEJ research stresses E-E-A-T for AI overview inclusion",
        implementationSteps: [
          "Add Person schema markup with credentials",
          "Link to author publications and social profiles",
          "Showcase relevant credentials inline",
          "Re-score after implementation"
        ],
        example: "Bio: \"Jane Doe, PhD in Environmental Science, has published 12 peer-reviewed studies on sustainable textile manufacturing.\"",
        impact: "High",
        difficulty: "Medium",
      },
    ],
  },
  {
    id: "freshness",
    title: "Freshness & Consistency",
    icon: TrendingUp,
    color: "bg-orange-50 text-orange-700",
    recommendations: [
      {
        title: "Content Freshness Ping",
        description: "Keep content updated and signal changes to crawlers",
        researchBacking: "AI prefers recent sources",
        implementationSteps: [
          "Update date stamps with true modification dates",
          "Increment version metadata in HTML",
          "Resubmit URL via Search Console/indexing API",
          "Monitor recrawling activity"
        ],
        example: "\"Last reviewed: May 19, 2025\" with true revision date",
        impact: "High",
        difficulty: "Easy",
      },
      {
        title: "Internal Topic Clusters",
        description: "Build interconnected content around core topics",
        researchBacking: "Interlinks increase surface area for answer synthesis by 27%",
        implementationSteps: [
          "Map pillar/cluster content structure",
          "Add contextual internal links with descriptive anchor text",
          "Implement breadcrumb schema",
          "Check for and fix orphaned pages"
        ],
        example: "Well-structured product page linking to \"See also: sizing guide, care instructions, and technical specifications\"",
        impact: "Medium",
        difficulty: "Medium",
      },
    ],
  },
  {
    id: "off-site",
    title: "Off-Site Optimization",
    icon: Globe,
    color: "bg-red-50 text-red-700",
    recommendations: [
      {
        title: "External Co-Citation Partnerships",
        description: "Build relationships with authoritative sources",
        researchBacking: "87% of SearchGPT citations mirror established authoritative sources",
        implementationSteps: [
          "Identify top aggregators in your industry",
          "Pitch guest data contributions with unique insights",
          "Secure do-follow links with precise brand mentions",
          "Track citation patterns and attribution"
        ],
        example: "Contribute proprietary statistics to industry reports published on authoritative domains",
        impact: "High",
        difficulty: "Hard",
      },
      {
        title: "Off-Site Authority Building",
        description: "Establish presence across multiple platforms",
        researchBacking: "External mentions increase brand citation probability by 35%",
        implementationSteps: [
          "Develop media outreach strategy targeting industry publications",
          "Secure guest post opportunities on authoritative sites",
          "Participate in industry podcasts with transcript publication",
          "Monitor brand mentions across key platforms"
        ],
        example: "Series of expert guest posts on leading industry blogs with consistent brand positioning and messaging",
        impact: "High",
        difficulty: "Hard",
      },
      {
        title: "Engage in Online Communities",
        description: "Participate in relevant Q&A platforms and forums",
        researchBacking: "Q&A platforms show 3-4x higher citation rates for expert responses",
        implementationSteps: [
          "Map relevant subreddits, Stack Exchange sites, and Quora topics",
          "Create branded expert profiles",
          "Schedule weekly engagement sessions",
          "Link to detailed resources when contextually appropriate"
        ],
        example: "Regularly answer questions on r/sustainability with data-backed responses linking to comprehensive resources",
        impact: "Medium",
        difficulty: "Medium",
      },
    ],
  },
  {
    id: "metrics",
    title: "Metrics & Monitoring",
    icon: BarChart3,
    color: "bg-indigo-50 text-indigo-700",
    recommendations: [
      {
        title: "Track AI Visibility, Tone, Compliance",
        description: "Monitor how AI engines cite your brand",
        researchBacking: "Brand citation and compliance tracking correlates with downstream conversion lift",
        implementationSteps: [
          "Implement AI response monitoring tools",
          "Track brand mentions across major AI platforms",
          "Establish baseline citation rates",
          "Create dashboards for citation performance"
        ],
        example: "Weekly citation tracking report showing brand mention frequency and compliance across key models: ChatGPT, Gemini, Perplexity, Anthropic and Google / Bing AI Overviews",
        impact: "High",
        difficulty: "Hard",
      },
      {
        title: "Shift Budget & Metrics",
        description: "Allocate resources specifically for GEO initiatives",
        researchBacking: "Companies allocating GEO budget can see 40%+ higher AI visibility",
        implementationSteps: [
          "Reassess KPI framework to include AI citation metrics",
          "Reallocate budget from traditional SEO to GEO initiatives",
          "Develop GEO-specific reporting",
          "Train team on new metrics and optimization approaches"
        ],
        example: "New reporting dashboard featuring AI citation rate, mention share, and content extractability scores alongside traditional SEO metrics",
        impact: "High",
        difficulty: "Hard",
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

                      {/* Implementation Steps */}
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Implementation Steps
                        </h4>
                        <ol className="space-y-1">
                          {rec.implementationSteps.map((step, stepIndex) => (
                            <li
                              key={stepIndex}
                              className="text-sm text-gray-600 flex items-start gap-2"
                            >
                              <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full text-xs flex items-center justify-center font-medium mt-0.5">
                                {stepIndex + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Example Implementation */}
                      {rec.example && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-1 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            Example Implementation
                          </h4>
                          <p className="text-sm text-gray-700 italic">{rec.example}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  );
}
