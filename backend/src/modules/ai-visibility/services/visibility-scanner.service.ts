import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ScanConfigDto } from '../dto/scan-config.dto';
import { ScanResultRepository } from '../repositories/scan-result.repository';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { BM25IndexService } from './bm25-index.service';
import { VectorIndexService } from './vector-index.service';
import { HybridSearchService } from './hybrid-search.service';
import { QueryGeneratorService } from './query-generator.service';
import { RecommendationService } from './recommendation.service';
import { 
  QueryResult, 
  CoverageMetrics, 
  VisibilityPattern 
} from '../schemas/scan-result.schema';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';

@Injectable()
export class VisibilityScannerService {
  private readonly logger = new Logger(VisibilityScannerService.name);

  constructor(
    private readonly scanResultRepository: ScanResultRepository,
    private readonly searchIndexRepository: SearchIndexRepository,
    private readonly bm25IndexService: BM25IndexService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly hybridSearchService: HybridSearchService,
    private readonly queryGeneratorService: QueryGeneratorService,
    private readonly recommendationService: RecommendationService,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {}

  async executeScan(
    projectId: string,
    config: ScanConfigDto
  ): Promise<string> {
    this.logger.log(`🎯 VISIBILITY SCANNER - Starting scan for project ${projectId}`);
    this.logger.log(`Config received: ${JSON.stringify(config)}`);
    
    const scanId = uuidv4();
    const maxResults = config.maxResults || 10;
    this.logger.log(`Generated scanId: ${scanId}, maxResults: ${maxResults}`);

    // Get indexes
    this.logger.log(`🔍 Getting indexes for project ${projectId}...`);
    const { bm25, vector } = await this.searchIndexRepository.getLatestIndexes(projectId);
    if (!bm25 || !vector) {
      this.logger.error(`❌ Indexes not ready - BM25: ${!!bm25}, Vector: ${!!vector}`);
      throw new Error('Indexes not ready. Please build indexes first.');
    }
    this.logger.log(`✅ Indexes found - BM25: ${bm25._id}, Vector: ${vector._id}`);

    // Create scan result document
    const scanResult = await this.scanResultRepository.create({
      projectId,
      scanId,
      status: 'running',
      startedAt: new Date(),
      configuration: {
        maxResults,
        useHybridSearch: config.useHybridSearch || false,
        querySource: config.querySource,
      },
      bm25IndexId: bm25._id as any,
      vectorIndexId: vector._id as any,
      coverageMetrics: {
        bm25Coverage: 0,
        vectorCoverage: 0,
        hybridCoverage: 0,
        queriesWithNoResults: [],
        queriesWithPerfectOverlap: [],
      },
      queryResults: [],
      visibilityPatterns: [],
    });

    // Run scan asynchronously
    this.logger.log(`🚀 Starting async scan execution...`);
    this.runScanAsync(scanId, projectId, config, bm25._id as any, vector._id as any, maxResults);

    return scanId;
  }

  private async runScanAsync(
    scanId: string,
    projectId: string,
    config: ScanConfigDto,
    bm25IndexId: Types.ObjectId,
    vectorIndexId: Types.ObjectId,
    maxResults: number
  ): Promise<void> {
    try {
      this.logger.log(`🔥 ASYNC SCAN STARTED - scanId: ${scanId}, project: ${projectId}`);
      
      // Get or generate queries
      this.logger.log(`📝 Generating queries...`);
      const queries = await this.getQueries(projectId, config);
      this.logger.log(`✅ Generated/retrieved ${queries.length} queries for scan`);
      
      if (queries.length > 0) {
        this.logger.log(`Sample queries: ["${queries.slice(0, 3).join('", "')}"]`);
      }
      
      if (queries.length === 0) {
        throw new Error('No queries generated or provided for scan');
      }
      
      // Store queries in the scan result
      await this.scanResultRepository.updateQueries(scanId, queries);
      
      // Execute searches
      const queryResults: QueryResult[] = [];
      
      this.logger.log(`🟢 NEW ENHANCED CODE IS RUNNING - Starting query execution loop`);
      
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        this.logger.log(`Executing query ${i + 1}/${queries.length}: "${query}"`);
        
        // Emit scan progress
        this.batchEventsGateway.emitScanProgress(projectId, {
          scanId,
          progress: Math.round(((i + 1) / queries.length) * 100),
          currentQuery: query,
          totalQueries: queries.length,
        });
        
        const result = await this.executeQuery(
          query,
          bm25IndexId,
          vectorIndexId,
          maxResults,
          config.useHybridSearch || false
        );
        queryResults.push(result);
      }

      // Calculate metrics
      this.logger.log(`Calculating metrics for ${queryResults.length} query results`);
      const coverageMetrics = this.calculateCoverageMetrics(queryResults);
      const visibilityPatterns = this.identifyPatterns(queryResults);
      const overallStats = this.calculateOverallStats(queryResults);
      
      this.logger.log(`Coverage metrics: BM25=${coverageMetrics.bm25Coverage}, Vector=${coverageMetrics.vectorCoverage}, Hybrid=${coverageMetrics.hybridCoverage}`);
      this.logger.log(`Visibility patterns found: ${visibilityPatterns.length}`);
      visibilityPatterns.forEach(pattern => {
        this.logger.log(`Pattern ${pattern.type}: ${pattern.percentage * 100}% (${pattern.affectedQueries.length} queries)`);
      });
      this.logger.log(`Overall stats: Avg Overlap=${overallStats.averageOverlap}, Avg MRR BM25=${overallStats.averageMrrBm25}, Avg MRR Vector=${overallStats.averageMrrVector}`);
      
      // Update scan result with all calculated data
      await this.scanResultRepository.updateResults(
        scanId,
        queryResults,
        coverageMetrics,
        visibilityPatterns
      );
      
      // Update overall stats separately
      await this.scanResultRepository.updateOverallStats(scanId, overallStats);
      
      // Add methodology explanation
      const methodology = {
        mrrExplanation: `Mean Reciprocal Rank (MRR) measures how early relevant results appear. A score of 1.0 means the first result is relevant, 0.5 means the second result is relevant, etc. Results are considered relevant if their score exceeds balanced quality thresholds (BM25: 2.0, Vector: 0.6).`,
        coverageExplanation: `Coverage represents the percentage of queries that return at least one truly relevant result (MRR > 0). This uses balanced thresholds to measure realistic AI visibility with industry-relevant questions.`,
        scoreThresholds: {
          bm25: 2.0,
          vector: 0.6,
        },
      };
      
      // Update methodology using findOneAndUpdate pattern
      await this.scanResultRepository.updateMethodology(scanId, methodology);

      // Generate recommendations
      const recommendations = await this.recommendationService.generateRecommendations(
        queryResults,
        coverageMetrics,
        visibilityPatterns
      );
      
      this.logger.log(`Generated ${recommendations.length} recommendations`);
      recommendations.forEach(rec => {
        this.logger.log(`Recommendation: ${rec.title} (${rec.priority})`);
      });

      await this.scanResultRepository.updateRecommendations(scanId, recommendations);
      await this.scanResultRepository.updateStatus(scanId, 'completed');
      
      this.logger.log(`Scan ${scanId} completed successfully`);
      
      // Emit scan completed event
      this.batchEventsGateway.emitScanCompleted(projectId, scanId);

    } catch (error) {
      this.logger.error(`Scan ${scanId} failed: ${error.message}`);
      this.logger.error(`Error stack: ${error.stack}`);
      await this.scanResultRepository.updateStatus(scanId, 'failed', error.message);
    }
  }

  private async getQueries(
    projectId: string,
    config: ScanConfigDto
  ): Promise<string[]> {
    switch (config.querySource) {
      case 'manual':
        return config.queries || [];
      case 'generated':
        return this.queryGeneratorService.generateQueries(
          projectId,
          config.generateQueryCount || 50
        );
      case 'search_console':
        // TODO: Implement Google Search Console integration
        this.logger.warn('Search Console integration not yet implemented');
        return this.queryGeneratorService.generateQueries(projectId, 20);
      default:
        return [];
    }
  }

  private async executeQuery(
    query: string,
    bm25IndexId: Types.ObjectId,
    vectorIndexId: Types.ObjectId,
    maxResults: number,
    useHybrid: boolean
  ): Promise<QueryResult> {
    this.logger.log(`\n=== EXECUTING QUERY: "${query}" ===`);
    
    // Execute BM25 search
    this.logger.log(`Executing BM25 search...`);
    const bm25Results = await this.bm25IndexService.search(
      bm25IndexId,
      query,
      maxResults
    );
    this.logger.log(`BM25 returned ${bm25Results.length} results`);
    if (bm25Results.length > 0) {
      this.logger.log(`BM25 raw scores: ${bm25Results.slice(0, 3).map(r => `${r.score.toFixed(4)}`).join(', ')}`);
    }

    // Execute vector search
    this.logger.log(`Executing Vector search...`);
    const vectorResults = await this.vectorIndexService.search(
      vectorIndexId,
      query,
      maxResults
    );
    this.logger.log(`Vector returned ${vectorResults.length} results`);
    if (vectorResults.length > 0) {
      this.logger.log(`Vector raw scores: ${vectorResults.slice(0, 3).map(r => `${r.score.toFixed(4)}`).join(', ')}`);
    }

    // Calculate overlap
    const overlap = this.hybridSearchService.calculateOverlap(
      bm25Results,
      vectorResults
    );

    // Hybrid search if requested
    let hybridResults;
    if (useHybrid) {
      hybridResults = this.hybridSearchService.reciprocalRankFusion(
        bm25Results,
        vectorResults
      ).slice(0, maxResults);
    }

    // Determine intent (simplified)
    let intent: 'informational' | 'navigational' | 'transactional' = 'informational';
    if (query.toLowerCase().includes('buy') || query.toLowerCase().includes('price')) {
      intent = 'transactional';
    } else if (query.split(' ').length <= 2) {
      intent = 'navigational';
    }

    // Calculate MRR (Mean Reciprocal Rank)
    // MRR measures how early relevant results appear in the ranking
    const calculateMRR = (results: any[], searchType: 'bm25' | 'vector') => {
      if (results.length === 0) return 0;
      
      // Balanced score thresholds for relevance
      // BM25 scores in Lunr can range from 0-20+, moderate threshold for keyword relevance
      // Vector scores are cosine similarity 0-1, moderate threshold for semantic relevance
      const scoreThreshold = searchType === 'bm25' ? 2.0 : 0.6;
      
      // Enhanced logging for debugging
      if (results.length > 0) {
        const scores = results.slice(0, 5).map(r => r.score.toFixed(3)).join(', ');
        this.logger.log(`Query: "${query}" | ${searchType} search - Top 5 scores: [${scores}] | Threshold: ${scoreThreshold}`);
      } else {
        this.logger.log(`Query: "${query}" | ${searchType} search - No results found`);
      }
      
      // Find the first result with a good score (above threshold)
      let firstRelevantPosition = -1;
      
      for (let i = 0; i < results.length; i++) {
        if (results[i].score >= scoreThreshold) {
          firstRelevantPosition = i + 1; // 1-indexed position
          this.logger.log(`Query: "${query}" | ${searchType} - First relevant result at position ${firstRelevantPosition} with score ${results[i].score.toFixed(3)}`);
          break;
        }
      }
      
      // If no relevant result found, return 0 (no MRR)
      if (firstRelevantPosition === -1) {
        this.logger.log(`Query: "${query}" | ${searchType} - No relevant results found (all scores below ${scoreThreshold})`);
        return 0;
      }
      
      const mrr = 1 / firstRelevantPosition;
      this.logger.log(`Query: "${query}" | ${searchType} - MRR: ${mrr.toFixed(3)}`);
      return mrr;
    };

    // Additional relevance validation - check if results contain query terms or related concepts
    const validateRelevance = (results: any[], query: string, searchType: string): any[] => {
      const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      this.logger.log(`${searchType} relevance validation - Query terms: [${queryTerms.join(', ')}]`);
      
      return results.map((result, index) => {
        const originalScore = result.score;
        
        // Check if snippet contains query terms or is substantive
        const snippet = result.snippet?.toLowerCase() || '';
        const hasQueryTerms = queryTerms.some(term => snippet.includes(term));
        const isSubstantive = snippet.length > 50; // Ensure meaningful content
        
        // Penalize results that don't seem relevant
        if (!hasQueryTerms && !isSubstantive) {
          result.score *= 0.3; // Significant penalty for potentially irrelevant results
          this.logger.log(`${searchType} result ${index}: Score ${originalScore.toFixed(4)} -> ${result.score.toFixed(4)} (no terms + short snippet)`);
        } else if (!hasQueryTerms || !isSubstantive) {
          result.score *= 0.7; // Moderate penalty
          this.logger.log(`${searchType} result ${index}: Score ${originalScore.toFixed(4)} -> ${result.score.toFixed(4)} (partial relevance)`);
        } else {
          this.logger.log(`${searchType} result ${index}: Score ${originalScore.toFixed(4)} (no penalty - relevant)`);
        }
        
        return result;
      });
    };

    // Apply relevance validation
    this.logger.log(`Applying relevance validation...`);
    const validatedBm25Results = validateRelevance([...bm25Results], query, 'BM25');
    const validatedVectorResults = validateRelevance([...vectorResults], query, 'Vector');

    const finalMrr = {
      bm25: calculateMRR(validatedBm25Results, 'bm25'),
      vector: calculateMRR(validatedVectorResults, 'vector'),
      hybrid: hybridResults ? calculateMRR(hybridResults, 'bm25') : undefined,
    };
    
    this.logger.log(`=== FINAL RESULTS FOR "${query}" ===`);
    this.logger.log(`Final MRR - BM25: ${finalMrr.bm25.toFixed(3)}, Vector: ${finalMrr.vector.toFixed(3)}, Overlap: ${Math.round(overlap * 100)}%`);
    this.logger.log(`Intent: ${intent}`);
    this.logger.log(`======================================\n`);

    return {
      query,
      intent,
      bm25Results: {
        documents: validatedBm25Results,
        found: validatedBm25Results.length > 0,
      },
      vectorResults: {
        documents: validatedVectorResults,
        found: validatedVectorResults.length > 0,
      },
      hybridResults: hybridResults ? { documents: hybridResults } : undefined,
      overlap,
      mrr: finalMrr,
    };
  }

  private calculateCoverageMetrics(queryResults: QueryResult[]): CoverageMetrics {
    const totalQueries = queryResults.length;
    
    // Handle empty results to avoid NaN
    if (totalQueries === 0) {
      return {
        bm25Coverage: 0,
        vectorCoverage: 0,
        hybridCoverage: 0,
        queriesWithNoResults: [],
        queriesWithPerfectOverlap: [],
      };
    }
    
    // Coverage based on queries with relevant results (MRR > 0)
    const bm25Coverage = queryResults.filter(r => r.mrr.bm25 > 0).length / totalQueries;
    const vectorCoverage = queryResults.filter(r => r.mrr.vector > 0).length / totalQueries;
    const hybridCoverage = queryResults.filter(r => 
      r.mrr.bm25 > 0 || r.mrr.vector > 0
    ).length / totalQueries;

    // Queries with no relevant results (MRR = 0 for both)
    const queriesWithNoResults = queryResults
      .filter(r => r.mrr.bm25 === 0 && r.mrr.vector === 0)
      .map(r => r.query);

    const queriesWithPerfectOverlap = queryResults
      .filter(r => r.overlap === 1)
      .map(r => r.query);

    return {
      bm25Coverage,
      vectorCoverage,
      hybridCoverage,
      queriesWithNoResults,
      queriesWithPerfectOverlap,
    };
  }

  private identifyPatterns(queryResults: QueryResult[]): VisibilityPattern[] {
    const patterns: VisibilityPattern[] = [];
    
    // Pattern: High BM25, Low Vector (good keyword match, poor semantic match)
    const highBm25LowVector = queryResults.filter(
      r => r.mrr.bm25 > 0 && r.mrr.vector === 0
    );
    
    if (highBm25LowVector.length > 0) {
      patterns.push({
        type: 'high_bm25_low_vector',
        affectedQueries: highBm25LowVector.map(r => r.query),
        percentage: highBm25LowVector.length / queryResults.length,
      });
    }

    // Pattern: High Vector, Low BM25 (good semantic match, poor keyword match)
    const highVectorLowBm25 = queryResults.filter(
      r => r.mrr.bm25 === 0 && r.mrr.vector > 0
    );
    
    if (highVectorLowBm25.length > 0) {
      patterns.push({
        type: 'high_vector_low_bm25',
        affectedQueries: highVectorLowBm25.map(r => r.query),
        percentage: highVectorLowBm25.length / queryResults.length,
      });
    }

    // Pattern: Both Low (no relevant results in either method)
    const bothLow = queryResults.filter(
      r => r.mrr.bm25 === 0 && r.mrr.vector === 0
    );
    
    if (bothLow.length > 0) {
      patterns.push({
        type: 'both_low',
        affectedQueries: bothLow.map(r => r.query),
        percentage: bothLow.length / queryResults.length,
      });
    }

    // Pattern: Both High (relevant results in both methods)
    const bothHigh = queryResults.filter(
      r => r.mrr.bm25 > 0 && r.mrr.vector > 0
    );
    
    if (bothHigh.length > 0) {
      patterns.push({
        type: 'both_high',
        affectedQueries: bothHigh.map(r => r.query),
        percentage: bothHigh.length / queryResults.length,
      });
    }

    // Pattern: Perfect MRR (top result is highly relevant)
    const perfectMrr = queryResults.filter(
      r => r.mrr.bm25 === 1 || r.mrr.vector === 1
    );
    
    if (perfectMrr.length > 0) {
      patterns.push({
        type: 'perfect_mrr',
        affectedQueries: perfectMrr.map(r => r.query),
        percentage: perfectMrr.length / queryResults.length,
      });
    }

    return patterns;
  }

  private calculateOverallStats(queryResults: QueryResult[]): any {
    if (queryResults.length === 0) {
      return {
        averageOverlap: 0,
        averageMrrBm25: 0,
        averageMrrVector: 0,
        totalQueries: 0,
        successfulQueries: 0,
      };
    }

    const totalQueries = queryResults.length;
    const successfulQueries = queryResults.filter(
      r => r.bm25Results.found || r.vectorResults.found
    ).length;

    const averageOverlap = queryResults.reduce((sum, r) => sum + r.overlap, 0) / totalQueries;
    const averageMrrBm25 = queryResults.reduce((sum, r) => sum + r.mrr.bm25, 0) / totalQueries;
    const averageMrrVector = queryResults.reduce((sum, r) => sum + r.mrr.vector, 0) / totalQueries;

    return {
      averageOverlap,
      averageMrrBm25,
      averageMrrVector,
      totalQueries,
      successfulQueries,
    };
  }

  async getScanResult(scanId: string) {
    return this.scanResultRepository.findById(scanId);
  }

  async getProjectScans(projectId: string, limit: number = 10) {
    return this.scanResultRepository.findByProject(projectId, limit);
  }
}