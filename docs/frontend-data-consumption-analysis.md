# Frontend Data Consumption Analysis

This document provides a detailed analysis of what data each frontend page consumes from the report object, including field mappings and transformations.

## 1. Visibility Page (`/visibility`)

### Data Consumed:
- **Overall Mention Rate**: 
  - Source: `reportData.kpi?.pulse?.value` OR `reportData.pulse?.value`
  - Transformation: Parsed as integer
  - Used for: Overall brand visibility percentage

- **Model-Specific Visibility**:
  - Source: `reportData.pulse?.modelVisibility`
  - Transformation: Maps to `{ model: string, mentionRate: number }`
  - Used for: Breakdown by AI model

- **Arena/Competitor Data**:
  - Source: `reportData.arena?.competitors`
  - Transformation: Extracts `modelsMentionsRate` for brand and competitors
  - Used for: Competitor comparison charts

- **Brand Name**:
  - Source: `reportData.brand` OR `report.metadata?.brand` OR `project.brandName`
  - Fallback chain for brand identification

### Display Components:
- Overall mention rate progress bar
- Model-specific mention rates with progress bars
- Competitor selection checkboxes
- Comparison charts between brand and competitors

### Current vs Ideal Field Names:
- Current: `kpi.pulse.value` → Should be: `visibility.overallMentionRate`
- Current: `pulse.modelVisibility` → Should be: `visibility.modelBreakdown`
- Current: `arena.competitors` → Should be: `competition.competitors`

---

## 2. Explorer Page (`/explorer` - Citations)

### Data Consumed:
- **Citations Data** (fetched separately via `getReportCitations`):
  - `webAccess.totalResponses`: Total prompts executed
  - `citations[]`: Array of citation objects containing:
    - `website`: Source URL
    - `webSearchQueries[]`: Search queries used
    - `link`: Citation link
    - `model`: AI model name
    - `promptType`: Type of prompt used
    - `promptIndex`: Index within prompt type

- **Spontaneous Data** (fetched separately via `getReportSpontaneous`):
  - `summary.topMentionCounts[]`: Top mentions with counts
  - `summary.topMentions[]`: Fallback for top mentions

- **Prompt Set** (fetched separately via `getPromptSet`):
  - Used to map `promptType` and `promptIndex` to actual prompt text

### Display Components:
- Metrics cards: Total prompts, Total links, Total sources
- Top 10 Mentions (from spontaneous data)
- Top 10 Keywords (from citations data)
- Top Sources with expandable list
- Detailed citations table with filters

### Current vs Ideal Field Names:
- Should have integrated citations data in main report
- Current: Separate API calls → Should be: Integrated in report response

---

## 3. Battle Page (`/battle` - Competition)

### Data Consumed:
- **Brand Battle Data**:
  - Source: `reportData.brandBattle`
  - Structure:
    ```typescript
    {
      competitorAnalyses: [{
        competitor: string,
        analysisByModel: [{
          model: string,
          strengths: string[],
          weaknesses: string[]
        }]
      }],
      commonStrengths: string[],
      commonWeaknesses: string[]
    }
    ```

- **Competitors List**:
  - Source: `project.competitors`
  - Used for: Knowing which competitors to display

- **Brand Name**:
  - Source: Same fallback chain as visibility page

### Display Components:
- Comparison tables for each competitor
- Strengths (green background) and Weaknesses (red background) rows
- Model-specific analysis columns
- Common patterns section

### Current vs Ideal Field Names:
- Current: `brandBattle` → Should be: `competition.headToHead`
- Structure is well-organized for this use case

---

## 4. Alignment Page (`/alignment` - Accuracy)

### Data Consumed:
- **Accuracy Data** (fetched via `getBatchResults`):
  - Filters for `resultType === "accuracy"` or `pipelineType === "accuracy"`
  - Transforms using `transformAccordToAlignment` function
  - Result structure includes:
    - Overall alignment score
    - Attribute-level scores by model
    - Detailed alignment data

### Display Components:
- Overall Alignment Snapshot card with percentage
- Attribute Scores by Model table
- Interactive cells showing detailed alignment information

### Current vs Ideal Field Names:
- Current: Fetched separately from batch results → Should be: Integrated in main report
- Current: `accord` → Should be: `alignment` or `accuracy`

---

## 5. Sentiment Page (`/sentiment` - Tone)

### Data Consumed:
- **Sentiment Score**:
  - Source: `reportData.kpi?.tone?.value`
  - Transformation: Parsed as integer

- **Tone Questions & Results**:
  - Source: `reportData.tone.questions[]`
  - Each question contains `results[]` with model-specific sentiment

- **Sentiment Counts**:
  - Calculated from all question results
  - Counts: positive (green), neutral (yellow), negative (red)

- **Model Sentiments**:
  - Source: `reportData.tone.sentiments[]`
  - Contains: `positiveKeywords[]` and `negativeKeywords[]`

### Display Components:
- Overall sentiment score gauge
- Sentiment distribution pie chart
- Sentiment heatmap (questions × models grid)
- Model detail drawer with keywords

### Current vs Ideal Field Names:
- Current: `tone` → Should remain `tone` or `sentiment`
- Well-structured for current use

---

## 6. Citations Page (`/citations`)

### Data Consumed:
- This is just a redirect to `/explorer`
- All functionality is in the Explorer page

---

## 7. Recommendations Page (`/recommendations`)

### Data Consumed:
- **Static Content Only**: No report data consumed
- This page displays static GEO (Generative Engine Optimization) recommendations

### Display Components:
- Accordion-based recommendation categories
- Implementation steps and examples
- Impact and difficulty badges

---

## Summary of Data Flow Issues

### 1. **Multiple API Calls**:
- Main report data
- Citations data (separate call)
- Spontaneous data (separate call)
- Batch results for alignment (separate call)
- Prompt set data (separate call)

### 2. **Inconsistent Naming**:
- `pulse` vs `visibility`
- `tone` vs `sentiment`
- `accord` vs `alignment`/`accuracy`
- `arena` vs `competition`

### 3. **Data Transformation Overhead**:
- Each page performs significant data transformation
- Fallback chains for brand name
- Complex calculations for derived metrics

### 4. **Suggested New Report Structure**:
```typescript
interface ImprovedReportStructure {
  // Metadata
  id: string;
  projectId: string;
  brandName: string;
  generatedAt: string;
  reportDate: string;
  
  // Visibility (formerly pulse)
  visibility: {
    overallMentionRate: number;
    modelBreakdown: Array<{
      model: string;
      mentionRate: number;
    }>;
  };
  
  // Competition (formerly arena + brandBattle)
  competition: {
    competitors: Array<{
      name: string;
      visibility: {
        overall: number;
        byModel: Array<{
          model: string;
          mentionRate: number;
        }>;
      };
    }>;
    headToHead: {
      analyses: Array<{
        competitor: string;
        byModel: Array<{
          model: string;
          strengths: string[];
          weaknesses: string[];
        }>;
      }>;
      commonPatterns: {
        strengths: string[];
        weaknesses: string[];
      };
    };
  };
  
  // Sentiment (formerly tone)
  sentiment: {
    overallScore: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    byModel: Array<{
      model: string;
      score: number;
      keywords: {
        positive: string[];
        negative: string[];
      };
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: string;
      }>;
    }>;
  };
  
  // Alignment (formerly accord)
  alignment: {
    overallScore: number;
    attributes: Array<{
      name: string;
      scores: Array<{
        model: string;
        score: number;
        details: any;
      }>;
    }>;
  };
  
  // Explorer (citations + spontaneous)
  explorer: {
    citations: {
      summary: {
        totalPrompts: number;
        totalLinks: number;
        totalSources: number;
      };
      topSources: Array<{
        domain: string;
        count: number;
      }>;
      topKeywords: Array<{
        keyword: string;
        count: number;
      }>;
      details: Array<{
        source: string;
        link: string;
        model: string;
        prompt: string;
        searchQueries: string[];
      }>;
    };
    mentions: {
      top: Array<{
        mention: string;
        count: number;
      }>;
    };
  };
}
```

This structure would:
1. Align with page architecture
2. Reduce API calls to a single request
3. Eliminate complex transformations
4. Use consistent, intuitive naming
5. Provide all data needed for each page