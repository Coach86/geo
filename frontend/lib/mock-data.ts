// Mock data generators for premium features

export const mockSentimentData = {
  overallSentiment: {
    positive: 65,
    neutral: 25,
    negative: 10,
  },
  sentimentByModel: [
    {
      model: "GPT-4",
      positive: 70,
      neutral: 20,
      negative: 10,
      details: "Your brand is perceived positively with strong trust indicators."
    },
    {
      model: "Claude",
      positive: 68,
      neutral: 24,
      negative: 8,
      details: "High brand confidence with excellent reputation markers."
    },
    {
      model: "Gemini",
      positive: 58,
      neutral: 31,
      negative: 11,
      details: "Good overall sentiment with room for improvement in clarity."
    }
  ],
  trendData: [
    { date: "2024-01", positive: 62, neutral: 28, negative: 10 },
    { date: "2024-02", positive: 64, neutral: 26, negative: 10 },
    { date: "2024-03", positive: 65, neutral: 25, negative: 10 },
  ],
  keyThemes: [
    { theme: "Innovation", sentiment: "positive", mentions: 45 },
    { theme: "Customer Service", sentiment: "positive", mentions: 38 },
    { theme: "Quality", sentiment: "positive", mentions: 33 },
    { theme: "Pricing", sentiment: "neutral", mentions: 28 },
  ]
};

export const mockAlignmentData = {
  overallAlignment: 78,
  alignmentByAttribute: [
    { attribute: "Innovative", aiScore: 85, targetScore: 90, gap: -5 },
    { attribute: "Reliable", aiScore: 82, targetScore: 85, gap: -3 },
    { attribute: "Customer-Focused", aiScore: 75, targetScore: 80, gap: -5 },
    { attribute: "Sustainable", aiScore: 68, targetScore: 75, gap: -7 },
    { attribute: "Premium", aiScore: 80, targetScore: 85, gap: -5 },
  ],
  modelComparison: [
    { model: "GPT-4", alignment: 82, strengths: ["Innovation", "Quality"], weaknesses: ["Sustainability"] },
    { model: "Claude", alignment: 76, strengths: ["Reliability", "Service"], weaknesses: ["Premium positioning"] },
    { model: "Gemini", alignment: 74, strengths: ["Customer focus"], weaknesses: ["Innovation", "Sustainability"] },
  ],
  recommendations: [
    "Emphasize sustainability initiatives in your messaging",
    "Strengthen innovation narrative with concrete examples",
    "Clarify premium value proposition across channels",
  ]
};

export const mockCompetitionData = {
  marketPosition: 2,
  totalCompetitors: 5,
  competitorAnalysis: [
    {
      name: "TechCorp Solutions",
      overallScore: 88,
      strengths: [
        "Market leadership position",
        "Strong brand recognition",
        "Extensive product portfolio",
        "Global distribution network"
      ],
      weaknesses: [
        "Higher pricing structure",
        "Less agile innovation process",
        "Complex user interfaces",
        "Slower customer support response"
      ],
      attributes: {
        innovation: 75,
        quality: 90,
        service: 85,
        value: 70,
      }
    },
    {
      name: "InnovateTech",
      overallScore: 85,
      strengths: [
        "Cutting-edge technology",
        "Strong R&D investment",
        "Developer-friendly platform",
        "Quick time-to-market"
      ],
      weaknesses: [
        "Limited market presence",
        "Higher learning curve",
        "Premium pricing only",
        "Smaller support team"
      ],
      attributes: {
        innovation: 95,
        quality: 85,
        service: 75,
        value: 65,
      }
    },
    {
      name: "ValueSoft Inc",
      overallScore: 75,
      strengths: [
        "Competitive pricing",
        "Wide distribution channels",
        "Simple user interface",
        "Good documentation"
      ],
      weaknesses: [
        "Quality consistency issues",
        "Limited advanced features",
        "Slower innovation cycle",
        "Basic customer support"
      ],
      attributes: {
        innovation: 60,
        quality: 70,
        service: 65,
        value: 85,
      }
    },
    {
      name: "Enterprise Systems",
      overallScore: 80,
      strengths: [
        "Enterprise-grade security",
        "Scalable architecture",
        "24/7 support available",
        "Industry compliance"
      ],
      weaknesses: [
        "Complex implementation",
        "High total cost of ownership",
        "Rigid customization options",
        "Long deployment times"
      ],
      attributes: {
        innovation: 70,
        quality: 88,
        service: 90,
        value: 62,
      }
    },
  ],
  competitiveAdvantages: [
    "Leading innovation in the category",
    "Superior customer satisfaction scores",
    "Strong quality perception",
    "Flexible pricing options"
  ],
  opportunities: [
    "Increase brand awareness campaigns",
    "Expand distribution channels",
    "Leverage innovation story more effectively",
    "Target mid-market segment growth"
  ]
};

// Helper function to generate random variations
export function generateMockVariation(baseValue: number, variance: number = 5): number {
  const min = Math.max(0, baseValue - variance);
  const max = Math.min(100, baseValue + variance);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate mock data with some randomization
export function getMockSentimentData() {
  const data = { ...mockSentimentData };
  // Add some random variation to make it look dynamic
  data.overallSentiment.positive = generateMockVariation(65, 5);
  data.overallSentiment.neutral = generateMockVariation(25, 3);
  data.overallSentiment.negative = 100 - data.overallSentiment.positive - data.overallSentiment.neutral;
  return data;
}

export function getMockAlignmentData() {
  const data = { ...mockAlignmentData };
  data.overallAlignment = generateMockVariation(78, 3);
  return data;
}

export function getMockCompetitionData() {
  return { ...mockCompetitionData };
}