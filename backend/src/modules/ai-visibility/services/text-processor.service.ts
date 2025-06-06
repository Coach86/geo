import { Injectable, Logger } from '@nestjs/common';
import { CrawledPageDocument } from '../schemas/crawled-page.schema';
import { IndexChunk } from '../schemas/search-index.schema';

@Injectable()
export class TextProcessorService {
  private readonly logger = new Logger(TextProcessorService.name);

  async processPages(pages: CrawledPageDocument[]): Promise<IndexChunk[]> {
    const chunks: IndexChunk[] = [];
    
    for (const page of pages) {
      const pageChunks = await this.chunkPage(page);
      chunks.push(...pageChunks);
    }

    return chunks;
  }

  private async chunkPage(page: CrawledPageDocument): Promise<IndexChunk[]> {
    // TODO: Implement semantic chunking
    const chunks: IndexChunk[] = [];
    const chunkSize = 600; // characters
    const overlap = 120; // characters
    
    const content = page.content || '';
    const words = content.split(/\s+/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      currentChunk += words[i] + ' ';
      
      if (currentChunk.length >= chunkSize || i === words.length - 1) {
        chunks.push({
          id: `${page._id}-${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            url: page.url,
            title: page.title,
            pageId: page._id?.toString() || '',
            position: chunkIndex,
          },
        });
        
        // Start next chunk with overlap
        const overlapWords = currentChunk.split(/\s+/).slice(-10).join(' ');
        currentChunk = overlapWords + ' ';
        chunkIndex++;
      }
    }

    return chunks;
  }

  normalizeForBM25(text: string): string[] {
    // Basic normalization for BM25
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }
}