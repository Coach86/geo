import { Injectable, Logger } from '@nestjs/common';
import { CitationItemDto, AggregatedCitationsDto } from '../dto/citation-item.dto';
import { DetailedCompetitionResult } from '../types/competition.types';
import { DetailedSentimentResult } from '../types/sentiment.types';
import { DetailedVisibilityResult } from '../types/visibility.types';
import { DetailedAlignmentResult } from '../types/alignment.types';
import { Citation } from '../types/citation.types';

/**
 * Service for extracting and aggregating citations from report results
 * Handles citation deduplication and aggregation logic
 */
@Injectable()
export class BrandReportCitationExtractorService {
  private readonly logger = new Logger(BrandReportCitationExtractorService.name);

  extractCitationsFromCompetition(
    detailedResults: DetailedCompetitionResult[]
  ): AggregatedCitationsDto {
    const citationMap = new Map<string, CitationItemDto>();
    
    detailedResults.forEach(result => {
      if (result.citations && Array.isArray(result.citations)) {
        result.citations.forEach(citation => {
          if (citation.url) {
            try {
              const urlObj = new URL(citation.url);
              const domain = urlObj.hostname.replace('www.', '');
              
              this.aggregateCitation(
                citationMap,
                citation,
                domain,
                citation.url,
                result.originalPrompt,
                undefined, // sentiment not applicable
                undefined, // score not applicable
                result.model,
                citation.title,
                citation.text
              );
            } catch (e) {
              this.logger.warn(`Invalid URL in competition citation: ${citation.url}`);
            }
          }
        });
      }
    });

    return this.buildAggregatedResult(citationMap);
  }

  extractCitationsFromSentiment(
    detailedResults: DetailedSentimentResult[]
  ): AggregatedCitationsDto {
    const citationMap = new Map<string, CitationItemDto>();
    
    detailedResults.forEach(result => {
      if (result.citations && Array.isArray(result.citations)) {
        result.citations.forEach(citation => {
          if (citation.url) {
            try {
              const urlObj = new URL(citation.url);
              const domain = urlObj.hostname.replace('www.', '');
              
              this.aggregateCitation(
                citationMap,
                citation,
                domain,
                citation.url,
                result.originalPrompt,
                result.sentiment || result.overallSentiment,
                undefined, // score not applicable
                result.model,
                citation.title,
                citation.text
              );
            } catch (e) {
              this.logger.warn(`Invalid URL in sentiment citation: ${citation.url}`);
            }
          }
        });
      }
    });

    return this.buildAggregatedResult(citationMap);
  }

  private aggregateCitation(
    citationMap: Map<string, CitationItemDto>,
    citation: any,
    domain: string,
    url: string,
    prompt?: string,
    sentiment?: string,
    score?: number,
    model?: string,
    title?: string,
    text?: string
  ): void {
    const key = `${domain}_${url}`;
    const existing = citationMap.get(key);
    
    if (existing) {
      existing.count++;
      
      if (prompt && !existing.prompts.includes(prompt)) {
        existing.prompts.push(prompt);
      }
      
      if (sentiment) {
        if (!existing.sentiments) existing.sentiments = [];
        if (!existing.sentiments.includes(sentiment)) {
          existing.sentiments.push(sentiment);
        }
      }
      
      if (score !== undefined) {
        if (!existing.scores) existing.scores = [];
        if (!existing.scores.includes(score)) existing.scores.push(score);
      }
      
      if (model && !existing.models.includes(model)) {
        existing.models.push(model);
      }
    } else {
      const newCitation: CitationItemDto = {
        domain,
        url,
        title: title || '',
        prompts: prompt ? [prompt] : [],
        sentiments: sentiment ? [sentiment] : undefined,
        scores: score !== undefined ? [score] : undefined,
        count: 1,
        models: model ? [model] : [],
        text
      };
      citationMap.set(key, newCitation);
    }
  }

  private buildAggregatedResult(
    citationMap: Map<string, CitationItemDto>
  ): AggregatedCitationsDto {
    const items = Array.from(citationMap.values());
    return {
      items,
      uniqueDomains: new Set(items.map(c => c.domain)).size,
      totalCitations: items.reduce((sum, c) => sum + c.count, 0)
    };
  }
}