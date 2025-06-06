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
    this.logger.log(`Starting visibility scan for project ${projectId}`);
    
    const scanId = uuidv4();
    const maxResults = config.maxResults || 10;

    // Get indexes
    const { bm25, vector } = await this.searchIndexRepository.getLatestIndexes(projectId);
    if (!bm25 || !vector) {
      throw new Error('Indexes not ready. Please build indexes first.');
    }

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
      this.logger.log(`Running scan ${scanId} for project ${projectId}`);
      
      // Get or generate queries
      const queries = await this.getQueries(projectId, config);
      this.logger.log(`Generated/retrieved ${queries.length} queries for scan`);
      
      if (queries.length === 0) {
        throw new Error('No queries generated or provided for scan');
      }
      
      // Store queries in the scan result
      await this.scanResultRepository.updateQueries(scanId, queries);
      
      // Execute searches
      const queryResults: QueryResult[] = [];
      
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
      
      this.logger.log(`Coverage metrics: BM25=${coverageMetrics.bm25Coverage}, Vector=${coverageMetrics.vectorCoverage}, Hybrid=${coverageMetrics.hybridCoverage}`);
      
      // Update scan result
      await this.scanResultRepository.updateResults(
        scanId,
        queryResults,
        coverageMetrics,
        visibilityPatterns
      );

      // Generate recommendations
      const recommendations = await this.recommendationService.generateRecommendations(
        queryResults,
        coverageMetrics,
        visibilityPatterns
      );

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
    // Execute BM25 search
    const bm25Results = await this.bm25IndexService.search(
      bm25IndexId,
      query,
      maxResults
    );

    // Execute vector search
    const vectorResults = await this.vectorIndexService.search(
      vectorIndexId,
      query,
      maxResults
    );

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

    return {
      query,
      intent,
      bm25Results: {
        documents: bm25Results,
        found: bm25Results.length > 0,
      },
      vectorResults: {
        documents: vectorResults,
        found: vectorResults.length > 0,
      },
      hybridResults: hybridResults ? { documents: hybridResults } : undefined,
      overlap,
      mrr: {
        bm25: bm25Results.length > 0 ? 1 / 1 : 0, // Simplified MRR
        vector: vectorResults.length > 0 ? 1 / 1 : 0,
        hybrid: hybridResults && hybridResults.length > 0 ? 1 / 1 : 0,
      },
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
    
    const bm25Coverage = queryResults.filter(r => r.bm25Results.found).length / totalQueries;
    const vectorCoverage = queryResults.filter(r => r.vectorResults.found).length / totalQueries;
    const hybridCoverage = queryResults.filter(r => 
      r.bm25Results.found || r.vectorResults.found
    ).length / totalQueries;

    const queriesWithNoResults = queryResults
      .filter(r => !r.bm25Results.found && !r.vectorResults.found)
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
    
    const highBm25LowVector = queryResults.filter(
      r => r.bm25Results.found && !r.vectorResults.found
    );
    
    if (highBm25LowVector.length > 0) {
      patterns.push({
        type: 'high_bm25_low_vector',
        affectedQueries: highBm25LowVector.map(r => r.query),
        percentage: highBm25LowVector.length / queryResults.length,
      });
    }

    const highVectorLowBm25 = queryResults.filter(
      r => !r.bm25Results.found && r.vectorResults.found
    );
    
    if (highVectorLowBm25.length > 0) {
      patterns.push({
        type: 'high_vector_low_bm25',
        affectedQueries: highVectorLowBm25.map(r => r.query),
        percentage: highVectorLowBm25.length / queryResults.length,
      });
    }

    const bothLow = queryResults.filter(
      r => !r.bm25Results.found && !r.vectorResults.found
    );
    
    if (bothLow.length > 0) {
      patterns.push({
        type: 'both_low',
        affectedQueries: bothLow.map(r => r.query),
        percentage: bothLow.length / queryResults.length,
      });
    }

    return patterns;
  }

  async getScanResult(scanId: string) {
    return this.scanResultRepository.findById(scanId);
  }

  async getProjectScans(projectId: string, limit: number = 10) {
    return this.scanResultRepository.findByProject(projectId, limit);
  }
}