import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { IndexChunk } from '../schemas/search-index.schema';
import { pipeline, env } from '@xenova/transformers';
import { HierarchicalNSW } from 'hnswlib-node';
import { BatchEventsGateway } from '../../batch/gateways/batch-events.gateway';

// Configure Transformers.js to use local models
(env as any).localURL = './models/';
env.allowRemoteModels = true;

@Injectable()
export class VectorIndexService {
  private readonly logger = new Logger(VectorIndexService.name);
  private embedder: any;
  private readonly embeddingModel = 'Xenova/all-MiniLM-L6-v2';
  private readonly dimension = 384; // all-MiniLM-L6-v2 outputs 384-dimensional vectors

  constructor(
    private readonly searchIndexRepository: SearchIndexRepository,
    private readonly batchEventsGateway: BatchEventsGateway,
  ) {
    this.initializeEmbedder();
  }

  private async initializeEmbedder() {
    try {
      this.logger.log(`Initializing embedder with model: ${this.embeddingModel}`);
      this.embedder = await pipeline('feature-extraction', this.embeddingModel);
      this.logger.log('Embedder initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize embedder: ${error.message}`);
    }
  }

  async buildIndex(
    projectId: string,
    chunks: IndexChunk[]
  ): Promise<Types.ObjectId> {
    this.logger.log(`Building vector index for project ${projectId}`);
    
    // Create index document
    const index = await this.searchIndexRepository.create({
      projectId,
      indexType: 'vector',
      version: '1.0',
      configuration: {
        embeddingModel: this.embeddingModel,
        dimension: this.dimension,
      },
      status: 'building',
      buildStartedAt: new Date(),
      chunkCount: chunks.length,
    });

    try {
      // Ensure embedder is initialized
      if (!this.embedder) {
        await this.initializeEmbedder();
      }

      // Generate embeddings for all chunks
      this.logger.log(`Generating embeddings for ${chunks.length} chunks`);
      const embeddings: number[][] = [];
      
      // Process in batches to avoid memory issues
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
          batch.map(chunk => this.generateEmbedding(chunk.content))
        );
        embeddings.push(...batchEmbeddings);
        
        if (i % 50 === 0) {
          this.logger.log(`Processed ${i + batch.length}/${chunks.length} chunks`);
          const progress = Math.round(((i + batch.length) / chunks.length) * 80) + 10;
          this.batchEventsGateway.emitIndexBuildProgress(projectId, {
            indexType: 'vector',
            progress,
            status: `Generating embeddings: ${i + batch.length}/${chunks.length}`,
          });
        }
      }

      // Build HNSW index
      this.logger.log('Building HNSW index');
      const hnswIndex = new HierarchicalNSW('cosine', this.dimension);
      hnswIndex.initIndex(chunks.length);
      
      // Add vectors to index
      for (let i = 0; i < embeddings.length; i++) {
        hnswIndex.addPoint(embeddings[i], i);
      }

      // Store chunks and embeddings
      await this.searchIndexRepository.updateChunks(
        index._id as any,
        chunks,
        chunks.length
      );

      // Store vector-specific data
      await this.searchIndexRepository.findByIdAndUpdate(
        index._id as any,
        {
          vectorData: {
            embeddings,
            hnswParams: {
              space: 'cosine',
              dimension: this.dimension,
              efConstruction: 200,
              M: 16,
            },
          },
        }
      );

      await this.searchIndexRepository.updateStatus(
        index._id as any,
        'ready'
      );

      this.logger.log(`Vector index built successfully with ${embeddings.length} vectors`);
      
      // Emit completion event
      this.batchEventsGateway.emitIndexBuildCompleted(projectId, {
        indexType: 'vector',
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

    if (!index.vectorData?.embeddings) {
      throw new Error('Vector index not built');
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Rebuild HNSW index from stored embeddings
      const hnswIndex = new HierarchicalNSW('cosine', this.dimension);
      hnswIndex.initIndex(index.vectorData.embeddings.length);
      
      for (let i = 0; i < index.vectorData.embeddings.length; i++) {
        hnswIndex.addPoint(index.vectorData.embeddings[i], i);
      }

      // Search for nearest neighbors
      const searchResults = hnswIndex.searchKnn(queryEmbedding, maxResults);
      
      this.logger.log(`🔍 Vector search for "${query}": Found ${searchResults.neighbors.length} neighbors`);
      if (searchResults.distances.length > 0) {
        const topDistances = searchResults.distances.slice(0, 3).map(d => d.toFixed(3)).join(', ');
        const topScores = searchResults.distances.slice(0, 3).map(d => (1 - d).toFixed(3)).join(', ');
        this.logger.log(`📊 Top 3 distances: [${topDistances}] → scores: [${topScores}]`);
      }
      
      // Map results to chunks and format
      const results = searchResults.neighbors
        .map((idx, i) => {
          const chunk = index.chunks[idx];
          if (!chunk) return null;
          
          // Convert distance to similarity score (1 - cosine distance)
          const score = 1 - searchResults.distances[i];
          
          return {
            url: chunk.metadata.url,
            score,
            snippet: this.generateSnippet(chunk.content, query),
          };
        })
        .filter(r => r !== null);

      return results;
    } catch (error) {
      this.logger.error(`Vector search error: ${error.message}`);
      return [];
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('Embedder not initialized');
    }

    try {
      // Generate embedding
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });
      
      // Convert to array
      return Array.from(output.data);
    } catch (error) {
      this.logger.error(`Embedding generation error: ${error.message}`);
      throw error;
    }
  }

  private generateSnippet(content: string, query: string, maxLength: number = 200): string {
    // Try to find query terms in content
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Find best matching position
    let bestPosition = -1;
    let bestScore = 0;
    
    for (let i = 0; i < contentLower.length - 50; i++) {
      let score = 0;
      const window = contentLower.substring(i, i + 200);
      
      for (const word of queryWords) {
        if (window.includes(word)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }
    
    if (bestPosition === -1) {
      // No match found, return beginning
      return content.substring(0, maxLength) + '...';
    }
    
    // Extract snippet around best position
    const start = Math.max(0, bestPosition - 50);
    const end = Math.min(content.length, bestPosition + 150);
    
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet;
  }
}