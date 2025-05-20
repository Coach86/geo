/**
 * TypeScript interfaces for the Brand Intelligence Email Report
 */

// Main report data interface
export interface BrandIntelligenceReportData {
  brand: string;
  metadata: ReportMetadata;
  kpi: KpiData;
  pulse: PulseData;
  tone: ToneData;
  accord: AccordData;
  arena: ArenaData;
}

export interface ReportMetadata {
  url: string;
  market: string;
  flag: string;
  competitors: string;
  date: string;
  models: string;
}

// KPI section data
export interface KpiData {
  pulse: {
    value: string;
    description: string;
  };
  tone: {
    value: string;
    status: string;
    description: string;
  };
  accord: {
    value: string;
    status: string;
    description: string;
  };
  arena: {
    competitors: string[];
    description: string;
  };
}

// Pulse section data
export interface PulseData {
  promptsTested: number;
  modelVisibility: ModelVisibility[];
}

export interface ModelVisibility {
  model: string;
  value: number;
}

// Tone section data
export interface ToneData {
  sentiments: SentimentData[];
  questions: QuestionData[];
}

export interface SentimentData {
  model: string;
  sentiment: string;
  status: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
}

export interface QuestionData {
  question: string;
  results: {
    model: string;
    sentiment: string;
    status: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
  }[];
}

// Accord section data
export interface AccordData {
  attributes: {
    name: string;
    rate: string;
    alignment: '✅' | '⚠️' | '❌';
  }[];
  score: {
    value: string;
    status: 'green' | 'yellow' | 'red';
  };
}

// Arena section data
export interface ArenaData {
  competitors: CompetitorData[];
  battle: {
    competitors: CompetitorBattleData[];
    chatgpt: {
      positives: string[];
      negatives: string[];
    };
    claude: {
      positives: string[];
      negatives: string[];
    };
  };
}

export interface CompetitorData {
  name: string;
  chatgpt: number;
  claude: number;
  mistral: number;
  gemini: number;
  global: string;
  size: 'lg' | 'md' | 'sm';
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface CompetitorBattleData {
  name: string;
  comparisons: {
    model: string;
    positives: string[];
    negatives: string[];
  }[];
}

// Component-specific props
export interface ReportHeaderProps {
  brand: string;
  metadata: ReportMetadata;
}

export interface ExecutiveSummaryProps {
  kpi: KpiData;
}

export interface PulseSectionProps {
  data: PulseData;
}

export interface ToneSectionProps {
  data: ToneData;
}

export interface AccordSectionProps {
  data: AccordData;
}

export interface ArenaSectionProps {
  data: ArenaData;
}

export interface ArenaBattleSectionProps {
  data: ArenaData['battle'];
}

export interface BrandIntelligenceReportProps {
  data?: BrandIntelligenceReportData;
}
