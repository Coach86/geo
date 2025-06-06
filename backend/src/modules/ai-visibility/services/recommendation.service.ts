import { Injectable, Logger } from '@nestjs/common';
import { 
  QueryResult, 
  CoverageMetrics, 
  VisibilityPattern 
} from '../schemas/scan-result.schema';

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  affectedPages: string[];
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  async generateRecommendations(
    queryResults: QueryResult[],
    coverageMetrics: CoverageMetrics,
    visibilityPatterns: VisibilityPattern[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check overall coverage
    if (coverageMetrics.bm25Coverage < 0.7) {
      recommendations.push({
        priority: 'high',
        type: 'keyword_optimization',
        title: 'Improve Keyword Coverage',
        description: `Only ${Math.round(coverageMetrics.bm25Coverage * 100)}% of queries return results in keyword search. Add missing target keywords to your content.`,
        impact: 'High - Directly improves discoverability in traditional search',
        effort: 'Medium - Requires content updates across multiple pages',
        affectedPages: this.getAffectedPages(queryResults, 'bm25'),
      });
    }

    if (coverageMetrics.vectorCoverage < 0.7) {
      recommendations.push({
        priority: 'high',
        type: 'semantic_optimization',
        title: 'Enhance Semantic Context',
        description: `Only ${Math.round(coverageMetrics.vectorCoverage * 100)}% of queries return results in semantic search. Enrich content with contextual information and related concepts.`,
        impact: 'High - Critical for AI system understanding',
        effort: 'Medium - Requires adding context and explanations',
        affectedPages: this.getAffectedPages(queryResults, 'vector'),
      });
    }

    // Pattern-based recommendations
    for (const pattern of visibilityPatterns) {
      switch (pattern.type) {
        case 'high_bm25_low_vector':
          if (pattern.percentage > 0.2) {
            recommendations.push({
              priority: 'high',
              type: 'context_enrichment',
              title: 'Add Contextual Content',
              description: 'Your content has good keyword matches but lacks semantic richness. Add explanations, use cases, and related concepts.',
              impact: 'High - Improves AI understanding without losing keyword strength',
              effort: 'Low - Add paragraphs explaining concepts',
              affectedPages: this.getUniqueUrls(queryResults, pattern.affectedQueries),
            });
          }
          break;

        case 'high_vector_low_bm25':
          if (pattern.percentage > 0.2) {
            recommendations.push({
              priority: 'medium',
              type: 'keyword_inclusion',
              title: 'Include Target Keywords',
              description: 'Your content is semantically rich but missing exact keyword matches. Add specific terms users search for.',
              impact: 'Medium - Improves traditional search visibility',
              effort: 'Low - Add keywords to headings and key paragraphs',
              affectedPages: this.getUniqueUrls(queryResults, pattern.affectedQueries),
            });
          }
          break;

        case 'both_low':
          if (pattern.percentage > 0.1) {
            recommendations.push({
              priority: 'high',
              type: 'content_gaps',
              title: 'Fill Content Gaps',
              description: 'Critical content missing for these queries. Create new pages or sections addressing these topics.',
              impact: 'Very High - Currently invisible for these queries',
              effort: 'High - Requires creating new content',
              affectedPages: [],
            });
          }
          break;
      }
    }

    // Structural recommendations
    if (coverageMetrics.queriesWithNoResults.length > 5) {
      recommendations.push({
        priority: 'medium',
        type: 'structured_data',
        title: 'Add Structured Data',
        description: 'Implement Schema.org markup (FAQ, HowTo, Product) to help AI systems understand your content structure.',
        impact: 'Medium - Improves content parsing by AI',
        effort: 'Low - Add JSON-LD to existing pages',
        affectedPages: [],
      });
    }

    // Chunk size recommendation
    const avgOverlap = queryResults.reduce((sum, r) => sum + r.overlap, 0) / queryResults.length;
    if (avgOverlap < 0.3) {
      recommendations.push({
        priority: 'medium',
        type: 'content_structure',
        title: 'Optimize Content Chunking',
        description: 'Low overlap between keyword and semantic search suggests content structure issues. Reorganize content into focused sections of 50-100 words.',
        impact: 'Medium - Better alignment between search methods',
        effort: 'Medium - Restructure existing content',
        affectedPages: [],
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private getAffectedPages(
    queryResults: QueryResult[], 
    searchType: 'bm25' | 'vector'
  ): string[] {
    const pages = new Set<string>();
    
    for (const result of queryResults) {
      const results = searchType === 'bm25' ? result.bm25Results : result.vectorResults;
      if (!results.found && results.documents.length > 0) {
        results.documents.forEach(doc => pages.add(doc.url));
      }
    }

    return Array.from(pages).slice(0, 5);
  }

  private getUniqueUrls(
    queryResults: QueryResult[],
    affectedQueries: string[]
  ): string[] {
    const urls = new Set<string>();
    
    for (const result of queryResults) {
      if (affectedQueries.includes(result.query)) {
        result.bm25Results.documents.forEach(doc => urls.add(doc.url));
        result.vectorResults.documents.forEach(doc => urls.add(doc.url));
      }
    }

    return Array.from(urls).slice(0, 5);
  }
}