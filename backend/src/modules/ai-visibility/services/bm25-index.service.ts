import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { TextProcessorService } from './text-processor.service';
import { IndexChunk } from '../schemas/search-index.schema';
import * as natural from 'natural';
import lunr from 'lunr';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';

@Injectable()
export class BM25IndexService {
  private readonly logger = new Logger(BM25IndexService.name);
  private readonly tokenizer = new natural.WordTokenizer();
  private readonly stemmer = natural.PorterStemmer;

  constructor(
    private readonly searchIndexRepository: SearchIndexRepository,
    private readonly textProcessorService: TextProcessorService,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {}

  async buildIndex(
    projectId: string,
    chunks: IndexChunk[]
  ): Promise<Types.ObjectId> {
    this.logger.log(`Building BM25 index for project ${projectId}`);
    
    // Create index document
    const index = await this.searchIndexRepository.create({
      projectId,
      indexType: 'bm25',
      version: '1.0',
      configuration: {
        k1: 1.2,
        b: 0.75,
      },
      status: 'building',
      buildStartedAt: new Date(),
      chunkCount: chunks.length,
    });

    try {
      // Process chunks for BM25
      this.batchEventsGateway.emitIndexBuildProgress(projectId, {
        indexType: 'bm25',
        progress: 10,
        status: 'Processing chunks',
      });
      
      const processedChunks = chunks.map((chunk, idx) => ({
        ...chunk,
        id: idx.toString(),
        tokens: this.tokenizeAndStem(chunk.content),
      }));

      // Build lunr index
      const lunrIndex = lunr(function() {
        this.ref('id');
        this.field('content');
        this.field('title');
        this.field('heading');
        
        // Add metadata fields
        this.metadataWhitelist = ['position'];
        
        processedChunks.forEach((chunk) => {
          this.add({
            id: chunk.id,
            content: chunk.content,
            title: chunk.metadata.title || '',
            heading: chunk.metadata.heading || '',
          });
        });
      });

      // Calculate document statistics for BM25
      const docStats = this.calculateDocumentStatistics(processedChunks);

      // Store index data
      await this.searchIndexRepository.updateChunks(
        index._id as any,
        chunks,
        chunks.length
      );

      // Store BM25-specific data
      await this.searchIndexRepository.findByIdAndUpdate(
        index._id as any,
        {
          bm25Data: {
            lunrIndex: JSON.stringify(lunrIndex),
            documentFrequencies: docStats.documentFrequencies,
            averageDocumentLength: docStats.avgLength,
            totalDocuments: chunks.length,
          },
        }
      );

      await this.searchIndexRepository.updateStatus(
        index._id as any,
        'ready'
      );
      
      // Emit completion event
      this.batchEventsGateway.emitIndexBuildCompleted(projectId, {
        indexType: 'bm25',
        indexId: (index._id as any).toString(),
      });

      return index._id as any;
    } catch (error) {
      await this.searchIndexRepository.updateStatus(
        index._id as any,
        'error',
        error.message
      );
      throw error;
    }
  }

  async search(
    indexId: Types.ObjectId,
    query: string,
    maxResults: number = 10
  ): Promise<Array<{ url: string; score: number; snippet: string }>> {
    const index = await this.searchIndexRepository.findById(indexId);
    if (!index) {
      throw new Error('Index not found');
    }

    if (!index.bm25Data?.lunrIndex) {
      throw new Error('BM25 index not built');
    }

    try {
      // Reconstruct lunr index
      const lunrIndex = lunr.Index.load(JSON.parse(index.bm25Data.lunrIndex));
      
      // Process query
      const processedQuery = this.tokenizeAndStem(query).join(' ');
      
      // Search using lunr
      const searchResults = lunrIndex.search(processedQuery);
      
      // Map results to chunks and format
      const results = searchResults
        .slice(0, maxResults)
        .map((result: any) => {
          const chunkIdx = parseInt(result.ref);
          const chunk = index.chunks[chunkIdx];
          
          if (!chunk) return null;
          
          // Generate snippet around matched terms
          const snippet = this.generateSnippet(chunk.content, query);
          
          return {
            url: chunk.metadata.url,
            score: result.score,
            snippet,
          };
        })
        .filter((r: any) => r !== null) as Array<{ url: string; score: number; snippet: string }>;

      // If no results, try fuzzy search
      if (results.length === 0) {
        const fuzzyResults = lunrIndex.search(`${processedQuery}~1`);
        return fuzzyResults
          .slice(0, maxResults)
          .map((result: any) => {
            const chunkIdx = parseInt(result.ref);
            const chunk = index.chunks[chunkIdx];
            
            if (!chunk) return null;
            
            return {
              url: chunk.metadata.url,
              score: result.score * 0.8, // Penalize fuzzy matches
              snippet: this.generateSnippet(chunk.content, query),
            };
          })
          .filter((r: any) => r !== null) as Array<{ url: string; score: number; snippet: string }>;
      }

      return results;
    } catch (error) {
      this.logger.error(`BM25 search error: ${error.message}`);
      return [];
    }
  }

  private tokenizeAndStem(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    return tokens.map(token => this.stemmer.stem(token));
  }

  private calculateDocumentStatistics(chunks: any[]) {
    const documentFrequencies = new Map<string, number>();
    let totalLength = 0;

    chunks.forEach((chunk: any) => {
      const uniqueTokens = new Set(chunk.tokens);
      uniqueTokens.forEach((token: string) => {
        documentFrequencies.set(token, (documentFrequencies.get(token) || 0) + 1);
      });
      totalLength += chunk.tokens.length;
    });

    return {
      documentFrequencies: Object.fromEntries(documentFrequencies),
      avgLength: totalLength / chunks.length,
    };
  }

  private generateSnippet(content: string, query: string, contextWords: number = 30): string {
    const queryTokens = this.tokenizeAndStem(query);
    const contentLower = content.toLowerCase();
    
    // Find first occurrence of any query token
    let bestPosition = -1;
    for (const token of queryTokens) {
      const pos = contentLower.indexOf(token);
      if (pos !== -1 && (bestPosition === -1 || pos < bestPosition)) {
        bestPosition = pos;
      }
    }

    if (bestPosition === -1) {
      // No match found, return beginning
      return content.substring(0, 200) + '...';
    }

    // Find word boundaries
    const words = content.split(/\s+/);
    let currentPos = 0;
    let wordIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      if (currentPos + words[i].length >= bestPosition) {
        wordIndex = i;
        break;
      }
      currentPos += words[i].length + 1;
    }

    // Extract context
    const start = Math.max(0, wordIndex - contextWords);
    const end = Math.min(words.length, wordIndex + contextWords);
    
    let snippet = words.slice(start, end).join(' ');
    if (start > 0) snippet = '...' + snippet;
    if (end < words.length) snippet = snippet + '...';
    
    return snippet;
  }
}