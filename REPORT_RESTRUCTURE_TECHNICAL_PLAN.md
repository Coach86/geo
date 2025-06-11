# Report Structure Refactoring Technical Plan

## Overview

This document outlines the technical plan to restructure the backend report objects to align with frontend data consumption patterns. The goal is to create a new report structure with 5 main fields (explorer, visibility, sentiment, alignment, competition) plus additional metadata fields, while integrating existing KPI data into these new fields.

## Implementation Status

### Phase 1: Define New Interfaces and Types ✅
- [x] Created `backend/src/modules/report/interfaces/new-report-structure.interfaces.ts`
- [x] Created `backend/src/modules/report/schemas/brand-report.schema.ts`
- [x] Created `backend/src/modules/report/dto/brand-report-response.dto.ts`
- [x] Created `backend/src/modules/report/controllers/brand-report.controller.ts`
- [x] Created `backend/src/modules/report/services/brand-report.service.ts`
- [x] Created `backend/src/modules/report/services/brand-report-persistence.service.ts`
- [x] Updated `backend/src/modules/report/report.module.ts`

### Phase 2: Update Batch Processing ✅
- [x] Created `backend/src/modules/batch/services/brand-report-orchestrator.service.ts`
- [x] Updated `backend/src/modules/batch/batch.module.ts`
- [x] Implemented data transformation from pipeline results to new structure

### Phase 3: Testing and Validation ✅
- [x] Build and verify compilation - **BUILD SUCCESSFUL**
- [ ] Create unit tests (optional - not required for cutover)

## Current State Analysis

### Frontend Data Consumption Patterns

1. **Explorer Page**: Consumes citations data, spontaneous data for top mentions
2. **Visibility Page**: Uses pulse data (mention rates, model visibility)
3. **Sentiment Page**: Uses tone data (sentiment analysis, heatmap)
4. **Alignment Page**: Uses accord data (attribute alignment scores)
5. **Battle Page**: Uses brandBattle data (competitor analysis)

### Current Backend Structure Issues

- Data is scattered across multiple fields (`kpi`, `pulse`, `tone`, `accord`, `arena`, `brandBattle`)
- Inconsistent naming conventions between frontend and backend
- Complex nested structures that don't match frontend consumption patterns
- Legacy fields (`spontaneous`, `sentiment`, `comparison`) are still present but underutilized

## New Report Structure Design

### Core Fields Mapping

```typescript
interface NewReportStructure {
  // Metadata fields
  id: string;
  projectId: string;
  reportDate: Date;
  generatedAt: Date;
  batchExecutionId?: string;
  brandName: string;
  metadata: ReportMetadata;
  
  // Main analysis fields
  explorer: ExplorerData;
  visibility: VisibilityData;
  sentiment: SentimentData;
  alignment: AlignmentData;
  competition: CompetitionData;
}
```

## Implementation Plan

### Phase 1: Define New Interfaces and Types

#### 1.1 Create New Interface Definitions

**File**: `backend/src/modules/report/interfaces/new-report-structure.interfaces.ts`

```typescript
// Metadata structure
interface ReportMetadata {
  url: string;
  market: string;
  countryCode: string;
  competitors: string[];
  modelsUsed: string[];
  promptsExecuted: number;
  executionContext: {
    batchId?: string;
    pipeline: string;
    version: string;
  };
}

// Explorer data - citations and web access
interface ExplorerData {
  summary: {
    totalPrompts: number;
    promptsWithWebAccess: number;
    webAccessPercentage: number;
    totalCitations: number;
    uniqueSources: number;
  };
  topMentions: {
    mention: string;
    count: number;
  }[];
  topKeywords: {
    keyword: string;
    count: number;
    percentage: number;
  }[];
  topSources: {
    domain: string;
    count: number;
    percentage: number;
  }[];
  citations: {
    website: string;
    link?: string;
    model: string;
    promptType: string;
    promptIndex: number;
    promptText?: string;
    webSearchQueries?: {
      query: string;
      timestamp?: string;
    }[];
  }[];
  webAccess: {
    totalResponses: number;
    successfulQueries: number;
    failedQueries: number;
  };
}

// Visibility data - brand mention rates
interface VisibilityData {
  overallMentionRate: number;
  promptsTested: number;
  modelVisibility: {
    model: string;
    mentionRate: number;
  }[];
  // Arena metrics extracted for visibility page
  arenaMetrics: {
    model: string;
    mentions: number;
    score: number;
    rank: number;
  }[];
}

// Sentiment data - tone analysis
interface SentimentData {
  overallScore: number;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  modelSentiments: {
    model: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    status: 'green' | 'yellow' | 'red';
    positiveKeywords: string[];
    negativeKeywords: string[];
  }[];
  heatmapData: {
    question: string;
    results: {
      model: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      status: 'green' | 'yellow' | 'red';
      llmResponse?: string;
    }[];
  }[];
}

// Alignment data - brand attribute alignment
interface AlignmentData {
  overallAlignmentScore: number;
  averageAttributeScores: Record<string, number>;
  attributeAlignmentSummary: {
    name: string;
    mentionRate: string;
    alignment: string;
  }[];
  detailedResults: {
    llmProvider: string;
    attributeScores: {
      attribute: string;
      score: number;
      evaluation: string;
    }[];
  }[];
}

// Competition data - competitor analysis
interface CompetitionData {
  brandName: string;
  competitors: string[];
  // Frontend expects competitorAnalyses with analysisByModel
  competitorAnalyses: {
    competitor: string;
    analysisByModel: {
      model: string;
      strengths: string[];
      weaknesses: string[];
    }[];
  }[];
  // Additional competitor metrics for arena view
  competitorMetrics: {
    competitor: string;
    overallRank: number;
    mentionRate: number;
    modelMentions: {
      model: string;
      rank: number;
      mentionRate: number;
    }[];
  }[];
  commonStrengths: string[];
  commonWeaknesses: string[];
}
```

#### 1.2 Create New Schema

**File**: `backend/src/modules/report/schemas/brand-report.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BrandReportDocument = BrandReport & Document;

@Schema({
  collection: 'brand_reports',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class BrandReport {
  @Prop({
    type: String,
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  projectId: string;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  reportDate: Date;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  generatedAt: Date;

  @Prop({
    type: String,
    required: false,
    index: true,
  })
  batchExecutionId: string;

  @Prop({
    type: String,
    required: true,
  })
  brandName: string;

  @Prop({
    type: Object,
    required: true,
  })
  metadata: {
    url: string;
    market: string;
    countryCode: string;
    competitors: string[];
    modelsUsed: string[];
    promptsExecuted: number;
    executionContext: {
      batchId?: string;
      pipeline: string;
      version: string;
    };
  };

  @Prop({
    type: Object,
    required: true,
  })
  explorer: {
    summary: {
      totalPrompts: number;
      promptsWithWebAccess: number;
      webAccessPercentage: number;
      totalCitations: number;
      uniqueSources: number;
    };
    topMentions: {
      mention: string;
      count: number;
    }[];
    topKeywords: {
      keyword: string;
      count: number;
      percentage: number;
    }[];
    topSources: {
      domain: string;
      count: number;
      percentage: number;
    }[];
    citations: {
      website: string;
      link?: string;
      model: string;
      promptType: string;
      promptIndex: number;
      promptText?: string;
      webSearchQueries?: {
        query: string;
        timestamp?: string;
      }[];
    }[];
    webAccess: {
      totalResponses: number;
      successfulQueries: number;
      failedQueries: number;
    };
  };

  @Prop({
    type: Object,
    required: true,
  })
  visibility: {
    overallMentionRate: number;
    promptsTested: number;
    modelVisibility: {
      model: string;
      mentionRate: number;
    }[];
    arenaMetrics: {
      model: string;
      mentions: number;
      score: number;
      rank: number;
    }[];
  };

  @Prop({
    type: Object,
    required: true,
  })
  sentiment: {
    overallScore: number;
    overallSentiment: string;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
    };
    modelSentiments: {
      model: string;
      sentiment: string;
      status: string;
      positiveKeywords: string[];
      negativeKeywords: string[];
    }[];
    heatmapData: {
      question: string;
      results: {
        model: string;
        sentiment: string;
        status: string;
        llmResponse?: string;
      }[];
    }[];
  };

  @Prop({
    type: Object,
    required: true,
  })
  alignment: {
    overallAlignmentScore: number;
    averageAttributeScores: Object;
    attributeAlignmentSummary: {
      name: string;
      mentionRate: string;
      alignment: string;
    }[];
    detailedResults: {
      llmProvider: string;
      attributeScores: {
        attribute: string;
        score: number;
        evaluation: string;
      }[];
    }[];
  };

  @Prop({
    type: Object,
    required: true,
  })
  competition: {
    brandName: string;
    competitors: string[];
    competitorAnalyses: {
      competitor: string;
      analysisByModel: {
        model: string;
        strengths: string[];
        weaknesses: string[];
      }[];
    }[];
    competitorMetrics: {
      competitor: string;
      overallRank: number;
      mentionRate: number;
      modelMentions: {
        model: string;
        rank: number;
        mentionRate: number;
      }[];
    }[];
    commonStrengths: string[];
    commonWeaknesses: string[];
  };

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const BrandReportSchema = SchemaFactory.createForClass(BrandReport);
```

### Phase 2: Update Controllers and DTOs

#### 2.1 Create New Response DTO

**File**: `backend/src/modules/report/dto/brand-report-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class BrandReportResponseDto {
  @ApiProperty({ description: 'Unique identifier for the report' })
  id: string;

  @ApiProperty({ description: 'Project ID this report is associated with' })
  projectId: string;

  @ApiProperty({ description: 'Report date' })
  reportDate: Date;

  @ApiProperty({ description: 'When the report was generated' })
  generatedAt: Date;

  @ApiProperty({ description: 'Brand name' })
  brandName: string;

  @ApiProperty({ description: 'Report metadata' })
  metadata: {
    url: string;
    market: string;
    countryCode: string;
    competitors: string[];
    modelsUsed: string[];
    promptsExecuted: number;
    executionContext: {
      batchId?: string;
      pipeline: string;
      version: string;
    };
  };

  @ApiProperty({ description: 'Explorer data - citations and web access' })
  explorer: {
    summary: {
      totalPrompts: number;
      promptsWithWebAccess: number;
      webAccessPercentage: number;
      totalCitations: number;
      uniqueSources: number;
    };
    topMentions: { mention: string; count: number }[];
    topKeywords: { keyword: string; count: number; percentage: number }[];
    topSources: { domain: string; count: number; percentage: number }[];
    citations: {
      website: string;
      link?: string;
      model: string;
      promptType: string;
      promptIndex: number;
      promptText?: string;
      webSearchQueries?: { query: string; timestamp?: string }[];
    }[];
    webAccess: {
      totalResponses: number;
      successfulQueries: number;
      failedQueries: number;
    };
  };

  @ApiProperty({ description: 'Visibility data - brand mention rates' })
  visibility: {
    overallMentionRate: number;
    promptsTested: number;
    modelVisibility: {
      model: string;
      mentionRate: number;
    }[];
    arenaMetrics: {
      model: string;
      mentions: number;
      score: number;
      rank: number;
    }[];
  };

  @ApiProperty({ description: 'Sentiment data - tone analysis' })
  sentiment: {
    overallScore: number;
    overallSentiment: string;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      total: number;
    };
    modelSentiments: {
      model: string;
      sentiment: string;
      status: string;
      positiveKeywords: string[];
      negativeKeywords: string[];
    }[];
    heatmapData: {
      question: string;
      results: {
        model: string;
        sentiment: string;
        status: string;
        llmResponse?: string;
      }[];
    }[];
  };

  @ApiProperty({ description: 'Alignment data - brand attribute alignment' })
  alignment: {
    overallAlignmentScore: number;
    averageAttributeScores: Record<string, number>;
    attributeAlignmentSummary: {
      name: string;
      mentionRate: string;
      alignment: string;
    }[];
    detailedResults: {
      llmProvider: string;
      attributeScores: {
        attribute: string;
        score: number;
        evaluation: string;
      }[];
    }[];
  };

  @ApiProperty({ description: 'Competition data - competitor analysis' })
  competition: {
    brandName: string;
    competitors: string[];
    competitorAnalyses: {
      competitor: string;
      analysisByModel: {
        model: string;
        strengths: string[];
        weaknesses: string[];
      }[];
    }[];
    competitorMetrics: {
      competitor: string;
      overallRank: number;
      mentionRate: number;
      modelMentions: {
        model: string;
        rank: number;
        mentionRate: number;
      }[];
    }[];
    commonStrengths: string[];
    commonWeaknesses: string[];
  };
}
```

#### 2.2 Update Controllers

**File**: `backend/src/modules/report/controllers/brand-report.controller.ts`

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BrandReportService } from '../services/brand-report.service';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';

@ApiTags('brand-reports')
@Controller('brand-reports')
export class BrandReportController {
  constructor(private readonly brandReportService: BrandReportService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get reports for a project' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of reports',
    type: [BrandReportResponseDto] 
  })
  async getProjectReports(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number
  ): Promise<BrandReportResponseDto[]> {
    return this.brandReportService.getProjectReports(projectId, limit);
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get a specific report' })
  @ApiResponse({ 
    status: 200, 
    description: 'Report details',
    type: BrandReportResponseDto 
  })
  async getReport(
    @Param('reportId') reportId: string
  ): Promise<BrandReportResponseDto> {
    return this.brandReportService.getReport(reportId);
  }

  @Get(':reportId/explorer')
  @ApiOperation({ summary: 'Get explorer data for a report' })
  async getExplorerData(@Param('reportId') reportId: string) {
    return this.brandReportService.getExplorerData(reportId);
  }

  @Get(':reportId/visibility')
  @ApiOperation({ summary: 'Get visibility data for a report' })
  async getVisibilityData(@Param('reportId') reportId: string) {
    return this.brandReportService.getVisibilityData(reportId);
  }

  @Get(':reportId/sentiment')
  @ApiOperation({ summary: 'Get sentiment data for a report' })
  async getSentimentData(@Param('reportId') reportId: string) {
    return this.brandReportService.getSentimentData(reportId);
  }

  @Get(':reportId/alignment')
  @ApiOperation({ summary: 'Get alignment data for a report' })
  async getAlignmentData(@Param('reportId') reportId: string) {
    return this.brandReportService.getAlignmentData(reportId);
  }

  @Get(':reportId/competition')
  @ApiOperation({ summary: 'Get competition data for a report' })
  async getCompetitionData(@Param('reportId') reportId: string) {
    return this.brandReportService.getCompetitionData(reportId);
  }
}
```

### Phase 3: Update Services

#### 3.1 Create New Brand Report Service

**File**: `backend/src/modules/report/services/brand-report.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BrandReport, BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';

@Injectable()
export class BrandReportService {
  constructor(
    @InjectModel(BrandReport.name)
    private brandReportModel: Model<BrandReportDocument>,
  ) {}

  async getProjectReports(
    projectId: string, 
    limit: number = 10
  ): Promise<BrandReportResponseDto[]> {
    const reports = await this.brandReportModel
      .find({ projectId })
      .sort({ reportDate: -1 })
      .limit(limit)
      .lean();

    return reports.map(report => this.mapToResponseDto(report));
  }

  async getReport(reportId: string): Promise<BrandReportResponseDto> {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.mapToResponseDto(report);
  }

  async getExplorerData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('explorer')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.explorer;
  }

  async getVisibilityData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('visibility')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.visibility;
  }

  async getSentimentData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('sentiment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.sentiment;
  }

  async getAlignmentData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('alignment')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.alignment;
  }

  async getCompetitionData(reportId: string) {
    const report = await this.brandReportModel
      .findOne({ id: reportId })
      .select('competition')
      .lean();

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return report.competition;
  }

  private mapToResponseDto(report: any): BrandReportResponseDto {
    return {
      id: report.id,
      projectId: report.projectId,
      reportDate: report.reportDate,
      generatedAt: report.generatedAt,
      brandName: report.brandName,
      metadata: report.metadata,
      explorer: report.explorer,
      visibility: report.visibility,
      sentiment: report.sentiment,
      alignment: report.alignment,
      competition: report.competition,
    };
  }
}
```

### Phase 4: Update Batch Processing

#### 4.1 Update Batch Services to Generate New Structure

The batch processing services need to be updated to generate data in the new structure directly:

**Spontaneous Pipeline**: 
- Populate `explorer.topMentions` with brand mention counts
- Contribute to `visibility.overallMentionRate` calculation
- Track which models mentioned the brand for `visibility.modelVisibility`

**Sentiment Pipeline**: 
- Populate entire `sentiment` section including:
  - `overallScore` and `overallSentiment`
  - `distribution` counts (positive/neutral/negative)
  - `modelSentiments` with keywords and status
  - `heatmapData` with question-based analysis

**Accuracy Pipeline**: 
- Populate entire `alignment` section including:
  - `overallAlignmentScore` (average across all models)
  - `averageAttributeScores` (per attribute averages)
  - `attributeAlignmentSummary` with mention rates
  - `detailedResults` with model-specific scores

**Comparison Pipeline**: 
- Populate `competition` section including:
  - `competitorAnalyses` with strengths/weaknesses
  - `competitorMetrics` with ranking and mention rates
  - `commonStrengths` and `commonWeaknesses`
- Contribute to `visibility.arenaMetrics` for competitor comparison

**Citations/Web Access Tracking** (across all pipelines):
- Populate `explorer` section with:
  - Web access statistics in `summary` and `webAccess`
  - `citations` array with all web sources consulted
  - `topKeywords` extracted from searches
  - `topSources` aggregated from citations

#### 4.2 Update Report Generation

The report generation process should create reports using the new schema structure instead of the old one.

## Implementation Order

1. **Week 1**: Define new interfaces, schemas, and DTOs
2. **Week 2**: Update controllers and services for new endpoints
3. **Week 3**: Update batch processing to generate new structure
4. **Week 4**: Testing and validation
5. **Week 5**: Deploy and cutover to new structure

## Testing Strategy

1. **Unit Tests**: Test new services and controllers
2. **API Tests**: Verify all new endpoints work correctly
3. **Frontend Tests**: Ensure frontend works with new data structure
4. **Performance Tests**: Verify query performance with new schema
5. **Batch Processing Tests**: Verify reports are generated correctly

## Benefits of New Structure

1. **Frontend Alignment**: Data structure matches exactly what frontend components expect
2. **Performance**: Optimized queries for each page's data needs
3. **Maintainability**: Clear separation of concerns between different analysis types
4. **Extensibility**: Easy to add new fields or analysis types
5. **API Clarity**: Clear, purpose-built endpoints for each data type

## Key Implementation Notes

1. **No Migration**: This is a clean cutover - old data will not be migrated
2. **Batch Processing**: Must be updated to generate new structure directly
3. **Frontend Updates**: API endpoints will change, frontend must be updated
4. **Testing**: Comprehensive testing before cutover is critical

## Field Name Mapping

### Changed Field Names

| Old Field Path | New Field Path | Notes |
|----------------|----------------|-------|
| `report.brand` | `report.brandName` | Standardized naming |
| `report.date` | `report.reportDate` | Clearer naming |
| `report.kpi.pulse.value` | `report.visibility.overallMentionRate` | Moved to visibility section |
| `report.pulse.promptsTested` | `report.visibility.promptsTested` | Moved to visibility section |
| `report.pulse.modelVisibility[].value` | `report.visibility.modelVisibility[].mentionRate` | Renamed for clarity |
| `report.kpi.tone.value` | `report.sentiment.overallScore` | Moved to sentiment section |
| `report.kpi.tone.status` | `report.sentiment.overallSentiment` | Moved to sentiment section |
| `report.kpi.accord.value` | `report.alignment.overallAlignmentScore` | Moved to alignment section |
| `report.brandBattle` | `report.competition.competitorAnalyses` | Renamed to match frontend usage |
| `report.brandBattle.commonStrengths` | `report.competition.commonStrengths` | Moved to competition section |
| `report.brandBattle.commonWeaknesses` | `report.competition.commonWeaknesses` | Moved to competition section |

### Removed Fields

| Old Field | Reason |
|-----------|--------|
| `report.llmVersions` | Not used by frontend |
| `report.spontaneous` | Legacy field, data moved to explorer.topMentions |
| `report.sentiment` | Legacy field, replaced by new sentiment section |
| `report.comparison` | Legacy field, replaced by competition section |

### New Fields Added

| New Field | Purpose |
|-----------|---------|
| `report.explorer` | Consolidated citations and web access data |
| `report.visibility.arenaMetrics` | Extracted from arena for visibility page |
| `report.competition.competitorMetrics` | Additional metrics for competitor analysis |

## API Endpoint Mapping

### Current → New Endpoint Mapping

| Current Endpoint | New Endpoint | Used By |
|-----------------|--------------|---------|
| GET /api/reports/project/:projectId | GET /api/brand-reports/project/:projectId | All pages (report selection) |
| GET /api/reports/:reportId | GET /api/brand-reports/:reportId | All pages (full report) |
| GET /api/reports/:reportId/citations | GET /api/brand-reports/:reportId/explorer | Explorer page |
| GET /api/reports/:reportId/spontaneous | GET /api/brand-reports/:reportId/explorer | Explorer page (topMentions) |
| GET /api/batch-results/:batchId?pipeline=accuracy | GET /api/brand-reports/:reportId/alignment | Alignment page |
| N/A | GET /api/brand-reports/:reportId/visibility | Visibility page |
| N/A | GET /api/brand-reports/:reportId/sentiment | Sentiment page |
| N/A | GET /api/brand-reports/:reportId/competition | Battle page |

### Frontend Changes Required

1. **Update API client** (`frontend/lib/api/report.ts`):
   - Change base URL from `/reports` to `/brand-reports`
   - Update response types to match new structure
   - Add new endpoint methods for field-specific fetching

2. **Update data processing**:
   - Remove `processReport` transformations in `useReportData` hook
   - Update type definitions in `frontend/types/reports.ts`
   - Adjust component props to consume new data structure directly

3. **Update components**:
   - Explorer page: Use `explorer` field directly
   - Visibility page: Use `visibility` field + `visibility.arenaMetrics`
   - Sentiment page: Use `sentiment` field directly
   - Alignment page: Use `alignment` field directly
   - Battle page: Use `competition.competitorAnalyses` instead of `brandBattle`

## Data Structure Validation Checklist

### Explorer Page Requirements ✓
- [x] `explorer.summary` - Metrics overview
- [x] `explorer.topMentions` - Top brand mentions
- [x] `explorer.topKeywords` - Search keywords
- [x] `explorer.topSources` - Domain statistics  
- [x] `explorer.citations` - Detailed citations with model, promptType, links
- [x] `explorer.webAccess` - Web access statistics

### Visibility Page Requirements ✓
- [x] `visibility.overallMentionRate` - Main metric
- [x] `visibility.modelVisibility` - Per-model mention rates
- [x] `visibility.arenaMetrics` - Competitor comparison data
- [x] `visibility.promptsTested` - Total prompts count

### Sentiment Page Requirements ✓
- [x] `sentiment.overallScore` - Main sentiment score
- [x] `sentiment.overallSentiment` - Overall sentiment category
- [x] `sentiment.distribution` - Counts by sentiment type
- [x] `sentiment.modelSentiments` - Per-model analysis with keywords
- [x] `sentiment.heatmapData` - Question-based sentiment grid

### Alignment Page Requirements ✓
- [x] `alignment.overallAlignmentScore` - Main alignment metric
- [x] `alignment.averageAttributeScores` - Per-attribute averages
- [x] `alignment.attributeAlignmentSummary` - Summary with rates
- [x] `alignment.detailedResults` - Model-specific attribute scores

### Competition Page Requirements ✓
- [x] `competition.brandName` - Brand identifier
- [x] `competition.competitors` - Competitor list
- [x] `competition.competitorAnalyses` - Strengths/weaknesses analysis
- [x] `competition.commonStrengths` - Aggregated strengths
- [x] `competition.commonWeaknesses` - Aggregated weaknesses

## Important Implementation Notes

1. **Field Naming**: The new structure uses exact field names that frontend components expect (e.g., `competitorAnalyses` not `competitorAnalysis`)

2. **Data Types**: All enums are properly typed (e.g., sentiment as `'positive' | 'neutral' | 'negative'`)

3. **Optional Fields**: Fields marked with `?` are optional and may not be present in all reports

4. **Array Structures**: All arrays maintain consistent object structures for easy mapping in frontend

5. **Cross-References**: Some data appears in multiple sections (e.g., arena metrics in both visibility and competition) to optimize frontend queries