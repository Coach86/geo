import BrandReport from "@/components/brand-report"

export default function Home() {
  // Sample data that would typically come from an API or database
  const reportData = {
    brand: "{brand}",
    metadata: {
      url: "brand.com",
      market: "US Market / English",
      flag: "🇺🇸",
      competitors: "Competitor A, Competitor B, Competitor C",
      date: "2025-05-09",
      models: "ChatGPT‑4o, Claude 3 Sonnet, Gemini 1.5 Pro, Mistral Le Chat Large",
    },
    kpi: {
      pulse: {
        value: "56%",
        description: "Global Visibility Score across all tested models",
      },
      tone: {
        value: "+0.20",
        status: "green",
        description: "Overall sentiment score across all models",
      },
      accord: {
        value: "6.2/10",
        status: "yellow",
        description: "Brand compliance with provided attributes",
      },
      arena: {
        competitors: ["Back Market", "Amazon Renewed", "Swappie"],
        description: "Top competitors mentioned by AI models",
      },
    },
    pulse: {
      promptsTested: 15,
      modelVisibility: [
        { model: "Claude 3", value: 70 },
        { model: "ChatGPT‑4o", value: 68 },
        { model: "Mistral Large", value: 54 },
        { model: "Gemini 1.5 Pro", value: 32 },
        { model: "Global Avg", value: 56, isAverage: true },
      ],
    },
    tone: {
      sentiments: [
        {
          model: "ChatGPT‑4o",
          sentiment: "+0.35",
          status: "green",
          positives: "affordable, eco",
          negatives: "limited warranty",
        },
        {
          model: "Claude 3",
          sentiment: "+0.18",
          status: "yellow",
          positives: "reliable, fast ship",
          negatives: "pricey",
        },
        {
          model: "Gemini",
          sentiment: "+0.05",
          status: "yellow",
          positives: "cheap, easy buy",
          negatives: "quality doubts",
        },
        {
          model: "Global Avg",
          sentiment: "+0.20",
          status: "green",
          positives: "—",
          negatives: "—",
          isAverage: true,
        },
      ],
      questions: [
        {
          question: "What do you think of …?",
          results: [
            { model: "ChatGPT‑4o", sentiment: "+0.35", status: "green", keywords: "affordable, eco-friendly" },
            { model: "Claude 3", sentiment: "+0.18", status: "yellow", keywords: "reliable, somewhat pricey" },
            { model: "Mistral Large", sentiment: "+0.22", status: "green", keywords: "good quality, trusted" },
            { model: "Gemini 1.5 Pro", sentiment: "+0.05", status: "yellow", keywords: "mixed reviews" },
          ],
        },
        {
          question: "Key pros/cons?",
          results: [
            { model: "ChatGPT‑4o", sentiment: "+0.30", status: "green", keywords: "sustainable vs limited options" },
            { model: "Claude 3", sentiment: "+0.15", status: "yellow", keywords: "durable vs expensive" },
            { model: "Mistral Large", sentiment: "+0.20", status: "green", keywords: "service vs availability" },
            { model: "Gemini 1.5 Pro", sentiment: "-0.10", status: "red", keywords: "easy to use vs quality concerns" },
          ],
        },
        {
          question: "Why choose …?",
          results: [
            { model: "ChatGPT‑4o", sentiment: "+0.40", status: "green", keywords: "environmental impact, quality" },
            { model: "Claude 3", sentiment: "+0.25", status: "green", keywords: "customer service, reliability" },
            { model: "Mistral Large", sentiment: "+0.15", status: "yellow", keywords: "brand reputation" },
            { model: "Gemini 1.5 Pro", sentiment: "+0.10", status: "yellow", keywords: "convenience, price" },
          ],
        },
      ],
    },
    accord: {
      attributes: [
        { name: "Sustainability", rate: "64%", alignment: "✅" },
        { name: "Affordability", rate: "42%", alignment: "⚠️" },
        { name: "Trust", rate: "78%", alignment: "✅" },
        { name: "Circular Economy", rate: "35%", alignment: "❌" },
        { name: "Warranty", rate: "28%", alignment: "❌" },
      ],
      score: { value: "6.2/10", status: "yellow" },
    },
    arena: {
      competitors: [
        {
          name: "Back Market",
          chatgpt: 1,
          claude: 1,
          mistral: 2,
          gemini: 2,
          global: "56%",
          size: "lg",
          sentiment: "positive",
        },
        {
          name: "Amazon Renewed",
          chatgpt: 2,
          claude: 2,
          mistral: 1,
          gemini: 1,
          global: "55%",
          size: "lg",
          sentiment: "positive",
        },
        {
          name: "Swappie",
          chatgpt: 3,
          claude: 4,
          mistral: 3,
          gemini: 3,
          global: "42%",
          size: "md",
          sentiment: "neutral",
        },
        {
          name: "Gazelle",
          chatgpt: 4,
          claude: 3,
          mistral: 5,
          gemini: 4,
          global: "38%",
          size: "sm",
          sentiment: "neutral",
        },
        {
          name: "eBay",
          chatgpt: 5,
          claude: 5,
          mistral: 4,
          gemini: 5,
          global: "35%",
          size: "sm",
          sentiment: "negative",
        },
      ],
      battle: {
        competitors: [
          {
            name: "Back Market",
            comparisons: [
              {
                model: "ChatGPT‑4o",
                positives: ["lower defect rate", "longer warranty"],
                negatives: ["smaller catalogue"],
              },
              {
                model: "Claude 3",
                positives: ["more rigorous testing", "eco-friendly packaging"],
                negatives: ["slower shipping times"],
              },
              {
                model: "Mistral Large",
                positives: ["better customer service", "quality guarantee"],
                negatives: ["higher price point"],
              },
              {
                model: "Gemini 1.5 Pro",
                positives: ["transparent sourcing", "detailed product specs"],
                negatives: ["fewer payment options"],
              },
            ],
          },
          {
            name: "Amazon Renewed",
            comparisons: [
              {
                model: "ChatGPT‑4o",
                positives: ["better quality control", "longer warranty"],
                negatives: ["higher prices", "smaller selection"],
              },
              {
                model: "Claude 3",
                positives: ["more eco-friendly", "better customer service"],
                negatives: ["slower delivery"],
              },
              {
                model: "Mistral Large",
                positives: ["more detailed product information", "better return policy"],
                negatives: ["less brand variety"],
              },
              {
                model: "Gemini 1.5 Pro",
                positives: ["more transparent refurbishment process", "better packaging"],
                negatives: ["more expensive shipping"],
              },
            ],
          },
          {
            name: "Swappie",
            comparisons: [
              {
                model: "ChatGPT‑4o",
                positives: ["specialized in phones", "expert knowledge"],
                negatives: ["limited to Apple products"],
              },
              {
                model: "Claude 3",
                positives: ["detailed grading system", "transparent pricing"],
                negatives: ["limited international shipping"],
              },
              {
                model: "Mistral Large",
                positives: ["longer testing process", "better battery replacements"],
                negatives: ["higher prices", "fewer models"],
              },
              {
                model: "Gemini 1.5 Pro",
                positives: ["better warranty on batteries", "more detailed photos"],
                negatives: ["limited to smartphones only"],
              },
            ],
          },
          {
            name: "Gazelle",
            comparisons: [
              {
                model: "ChatGPT‑4o",
                positives: ["quick buying process", "instant quotes"],
                negatives: ["lower trade-in values", "US-focused"],
              },
              {
                model: "Claude 3",
                positives: ["easy selling process", "fast payment"],
                negatives: ["limited international presence"],
              },
              {
                model: "Mistral Large",
                positives: ["good condition verification", "30-day guarantee"],
                negatives: ["smaller selection", "fewer brands"],
              },
              {
                model: "Gemini 1.5 Pro",
                positives: ["easy trade-in process", "quick shipping"],
                negatives: ["less detailed product descriptions"],
              },
            ],
          },
        ],
        chatgpt: {
          positives: ["lower defect rate", "longer warranty", "better customer service"],
          negatives: ["smaller catalogue", "higher price point"],
        },
        claude: {
          positives: ["more rigorous testing", "eco-friendly packaging"],
          negatives: ["slower shipping times", "fewer payment options"],
        },
      },
    },
    lift: {
      recommendations: [
        {
          text: "Submit FAQ markup to improve Gemini visibility",
          priority: "High",
          priorityClass: "priority-high",
          effort: "Easy",
          effortClass: "effort-easy",
        },
        {
          text: 'Include "circular economy" keyword in homepage H1',
          priority: "Medium",
          priorityClass: "priority-medium",
          effort: "Easy",
          effortClass: "effort-easy",
        },
        {
          text: "Publish comparison vs Amazon Renewed focusing on reliability",
          priority: "High",
          priorityClass: "priority-high",
          effort: "Hard",
          effortClass: "effort-hard",
        },
      ],
    },
    trace: {
      sources: [
        {
          name: "YouTube",
          percentage: 22,
          color: "#1976d2",
          url: "https://www.youtube.com/results?search_query=brand+reviews",
        },
        { name: "Reddit", percentage: 18, color: "#2196f3", url: "https://www.reddit.com/search/?q=brand+reviews" },
        { name: "Official Site", percentage: 15, color: "#64b5f6", url: "https://www.brand.com" },
        { name: "TechRadar", percentage: 10, color: "#90caf9", url: "https://www.techradar.com/reviews/brand" },
        { name: "Trustpilot", percentage: 7, color: "#bbdefb", url: "https://www.trustpilot.com/review/brand.com" },
        { name: "Wikipedia", percentage: 6, color: "#e3f2fd", url: "https://en.wikipedia.org/wiki/Brand" },
        { name: "Other", percentage: 22, color: "#ccc" },
      ],
      modelStats: [
        { model: "ChatGPT‑4o", webAccessRate: 85 },
        { model: "Claude 3", webAccessRate: 92 },
        { model: "Mistral Large", webAccessRate: 78 },
        { model: "Gemini 1.5 Pro", webAccessRate: 88 },
      ],
    },
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <BrandReport data={reportData} />
      </div>
    </main>
  )
}
