import { Injectable } from '@nestjs/common';

@Injectable()
export class HybridSearchService {
  reciprocalRankFusion(
    bm25Results: Array<{ url: string; score: number }>,
    vectorResults: Array<{ url: string; score: number }>,
    k: number = 60
  ): Array<{ url: string; score: number; source: 'bm25' | 'vector' | 'both' }> {
    const scores = new Map<string, { bm25Rank?: number; vectorRank?: number }>();

    // Process BM25 results
    bm25Results.forEach((result, index) => {
      if (!scores.has(result.url)) {
        scores.set(result.url, {});
      }
      scores.get(result.url)!.bm25Rank = index + 1;
    });

    // Process vector results
    vectorResults.forEach((result, index) => {
      if (!scores.has(result.url)) {
        scores.set(result.url, {});
      }
      scores.get(result.url)!.vectorRank = index + 1;
    });

    // Calculate RRF scores
    const fusedResults: Array<{ url: string; score: number; source: 'bm25' | 'vector' | 'both' }> = [];
    
    scores.forEach((ranks, url) => {
      let rrfScore = 0;
      let source: 'bm25' | 'vector' | 'both' = 'both';

      if (ranks.bm25Rank && ranks.vectorRank) {
        rrfScore = 1 / (k + ranks.bm25Rank) + 1 / (k + ranks.vectorRank);
        source = 'both';
      } else if (ranks.bm25Rank) {
        rrfScore = 1 / (k + ranks.bm25Rank);
        source = 'bm25';
      } else if (ranks.vectorRank) {
        rrfScore = 1 / (k + ranks.vectorRank);
        source = 'vector';
      }

      fusedResults.push({ url, score: rrfScore, source });
    });

    // Sort by RRF score
    return fusedResults.sort((a, b) => b.score - a.score);
  }

  calculateOverlap(
    bm25Results: Array<{ url: string }>,
    vectorResults: Array<{ url: string }>
  ): number {
    const bm25Urls = new Set(bm25Results.map(r => r.url));
    const vectorUrls = new Set(vectorResults.map(r => r.url));
    
    const intersection = new Set([...bm25Urls].filter(x => vectorUrls.has(x)));
    const union = new Set([...bm25Urls, ...vectorUrls]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}