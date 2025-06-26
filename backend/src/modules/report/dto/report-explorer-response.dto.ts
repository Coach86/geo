import { ApiProperty } from '@nestjs/swagger';

class ExplorerSummaryDto {
  @ApiProperty({ description: 'Total number of prompts executed' })
  totalPrompts: number;

  @ApiProperty({ description: 'Number of prompts that used web access' })
  promptsWithWebAccess: number;

  @ApiProperty({ description: 'Percentage of prompts with web access' })
  webAccessPercentage: number;

  @ApiProperty({ description: 'Total number of citations' })
  totalCitations: number;

  @ApiProperty({ description: 'Number of unique sources cited' })
  uniqueSources: number;
}

class TopKeywordDto {
  @ApiProperty({ description: 'Keyword text' })
  keyword: string;

  @ApiProperty({ description: 'Number of occurrences' })
  count: number;

  @ApiProperty({ description: 'Percentage of total' })
  percentage: number;
}

class TopSourceDto {
  @ApiProperty({ description: 'Domain name' })
  domain: string;

  @ApiProperty({ description: 'Number of citations from this domain' })
  count: number;

  @ApiProperty({ description: 'Percentage of total citations' })
  percentage: number;
}

class WebSearchCitationDto {
  @ApiProperty({ description: 'Website domain' })
  website: string;

  @ApiProperty({ description: 'Full URL link', required: false })
  link?: string;

  @ApiProperty({ description: 'AI model that generated this citation' })
  model: string;

  @ApiProperty({ description: 'Type of prompt' })
  promptType: string;

  @ApiProperty({ description: 'Index of the prompt' })
  promptIndex: number;

  @ApiProperty({ description: 'Source information', required: false })
  source?: string;
}

class WebSearchResultDto {
  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Timestamp of the search', required: false })
  timestamp?: string;

  @ApiProperty({ description: 'Models that performed this search', type: [String] })
  models: string[];

  @ApiProperty({ description: 'Types of prompts that triggered this search', type: [String] })
  promptTypes: string[];

  @ApiProperty({ description: 'Citations found from this search', type: [WebSearchCitationDto] })
  citations: WebSearchCitationDto[];
}

class WebAccessStatsDto {
  @ApiProperty({ description: 'Total number of responses' })
  totalResponses: number;

  @ApiProperty({ description: 'Number of successful queries' })
  successfulQueries: number;

  @ApiProperty({ description: 'Number of failed queries' })
  failedQueries: number;
}

class CompetitorBreakdownDto {
  @ApiProperty({ description: 'Competitor name' })
  name: string;

  @ApiProperty({ description: 'Number of citations' })
  count: number;

  @ApiProperty({ description: 'Percentage of citations' })
  percentage: number;
}

class DomainSourceAnalysisDto {
  @ApiProperty({ description: 'Percentage of citations from brand domain' })
  brandDomainPercentage: number;

  @ApiProperty({ description: 'Percentage of citations from other sources' })
  otherSourcesPercentage: number;

  @ApiProperty({ description: 'Number of citations from brand domain' })
  brandDomainCount: number;

  @ApiProperty({ description: 'Number of citations from other sources' })
  otherSourcesCount: number;

  @ApiProperty({ 
    description: 'Breakdown by competitor domains', 
    type: [CompetitorBreakdownDto], 
    required: false 
  })
  competitorBreakdown?: CompetitorBreakdownDto[];

  @ApiProperty({ description: 'Number of citations from unknown sources', required: false })
  unknownSourcesCount?: number;

  @ApiProperty({ description: 'Percentage of citations from unknown sources', required: false })
  unknownSourcesPercentage?: number;
}

export class ExplorerData {
  @ApiProperty({ description: 'Summary statistics', type: ExplorerSummaryDto })
  summary: ExplorerSummaryDto;

  @ApiProperty({ description: 'Top keywords found', type: [TopKeywordDto] })
  topKeywords: TopKeywordDto[];

  @ApiProperty({ description: 'Top source domains', type: [TopSourceDto] })
  topSources: TopSourceDto[];

  @ApiProperty({ 
    description: 'Web search results grouped by query', 
    type: [WebSearchResultDto], 
    required: false 
  })
  webSearchResults?: WebSearchResultDto[];

  @ApiProperty({ description: 'Web access statistics', type: WebAccessStatsDto })
  webAccess: WebAccessStatsDto;

  @ApiProperty({ 
    description: 'Analysis of citation sources by domain', 
    type: DomainSourceAnalysisDto, 
    required: false 
  })
  domainSourceAnalysis?: DomainSourceAnalysisDto;
}