# Visibility API Response Structure

## Overview
The visibility API endpoint (`GET /brand-reports/:reportId/visibility`) returns data about brand mention rates across different AI models, including competitor comparison data.

## API Response Structure

### Main VisibilityData Interface
```typescript
interface VisibilityData {
  // Overall brand mention rate across all models (0-100)
  overallMentionRate: number;
  
  // Total number of prompts tested
  promptsTested: number;
  
  // Per-model visibility metrics for the brand
  modelVisibility: {
    model: string;        // Model name (e.g., "gpt-4o", "claude-3-opus")
    mentionRate: number;  // Mention rate for this model (0-100)
  }[];
  
  // Arena metrics - competitor comparison data
  arenaMetrics: {
    name: string;                    // Competitor name
    size?: 'lg' | 'md' | 'sm';      // Competitor size category
    global?: string;                 // Global mention rate
    modelsMentionsRate?: Array<{
      model: string;                 // Model name
      mentionsRate: number;          // Mention rate for this competitor (0-100)
    }>;
  }[];
}
```

## Data Flow

### 1. Backend Processing (VisibilityPipelineResult)
The backend processes visibility analysis for each prompt/model combination:
```typescript
interface VisibilityPipelineResult {
  llmProvider: string;      // Provider name (e.g., "OpenAI", "Anthropic")
  llmModel: string;         // Model ID (e.g., "gpt-4o", "claude-3-opus")
  promptIndex: number;      // Index of the prompt tested
  mentioned: boolean;       // Whether the brand was mentioned
  topOfMind: string[];      // List of brands mentioned spontaneously
  originalPrompt?: string;  // The prompt that was sent
  llmResponse?: string;     // The raw LLM response
  error?: string;          // Any error that occurred
  usedWebSearch?: boolean; // Whether web search was used
  citations?: any[];       // Web search citations
}
```

### 2. Aggregated Results (VisibilityResults)
Results are aggregated across all prompts and models:
```typescript
interface VisibilityResults {
  results: VisibilityPipelineResult[];
  summary: {
    mentionRate: number;      // Overall mention rate (0-1)
    topMentions: string[];    // Most frequently mentioned brands
    topMentionCounts?: {      // Count for each top mention
      mention: string;
      count: number;
    }[];
  };
  webSearchSummary: {
    usedWebSearch: boolean;
    webSearchCount: number;
    consultedWebsites: string[];
    consultedWebsiteCounts?: {
      domain: string;
      count: number;
    }[];
  };
  brandVisibility?: {         // Dashboard-specific data
    globalMentionRate: number;
    promptsTested: number;
    totalRuns: number;
    modelBreakdown: {
      name: string;
      mentionRate: number;
      promptsTested: number;
      runs: number;
    }[];
  };
}
```

### 3. Arena Metrics Calculation
The `arenaMetrics` field contains competitor comparison data:

1. **Data Source**: The system analyzes `topOfMind` mentions from all visibility pipeline results
2. **Competitor Filtering**: Only configured competitors (from project settings) are included
3. **Per-Model Calculation**: For each competitor and model combination, the system counts how many times that competitor was mentioned
4. **Mention Rate**: Calculated as (mentions / total prompts) * 100 for each model

Example arena metrics:
```json
{
  "arenaMetrics": [
    {
      "name": "Nike",
      "size": "lg",
      "global": "75",
      "modelsMentionsRate": [
        { "model": "gpt-4o", "mentionsRate": 80 },
        { "model": "claude-3-opus", "mentionsRate": 70 }
      ]
    },
    {
      "name": "Adidas", 
      "size": "lg",
      "global": "65",
      "modelsMentionsRate": [
        { "model": "gpt-4o", "mentionsRate": 70 },
        { "model": "claude-3-opus", "mentionsRate": 60 }
      ]
    }
  ]
}
```

## Frontend Usage

### Visibility Hook
The `useVisibilityReports` hook processes visibility data for display:
```typescript
interface UseVisibilityReportsReturn {
  loading: boolean;
  error: string | null;
  averageScore: number;           // Average mention rate across selected models
  scoreVariation: number;         // Change from previous period
  competitors: CompetitorData[];  // Competitor performance data
  chartData: Array<{             // Time series data for charts
    date: string;
    [key: string]: string | number; // Dynamic keys for brand/competitor names
  }>;
  modelBreakdown: Array<{        // Per-model performance
    model: string;
    brandScore: number;
    competitorScores: Record<string, number>;
  }>;
}
```

### VisibilityAnalysis Component
The main component displays:
- Overall brand mention rate
- Per-model mention rates with visual progress bars
- Competitor selection checkboxes
- Competitor comparison data from arenaMetrics

## Key Points

1. **Mention Rate**: All mention rates are percentages (0-100)
2. **Competitor Data**: Only includes competitors configured in the project settings
3. **Model Names**: Use friendly display names (e.g., "ChatGPT" instead of "gpt-4o")
4. **Arena Metrics**: Provides head-to-head comparison between brand and competitors
5. **Time Series**: Frontend can aggregate multiple reports to show trends over time

## Example API Response
```json
{
  "overallMentionRate": 75,
  "promptsTested": 10,
  "modelVisibility": [
    { "model": "gpt-4o", "mentionRate": 80 },
    { "model": "claude-3-opus", "mentionRate": 70 }
  ],
  "arenaMetrics": [
    {
      "name": "Competitor1",
      "size": "lg",
      "global": "65",
      "modelsMentionsRate": [
        { "model": "gpt-4o", "mentionsRate": 70 },
        { "model": "claude-3-opus", "mentionsRate": 60 }
      ]
    }
  ]
}
```