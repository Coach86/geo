import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AEOScoringService } from '../../crawler/services/aeo-scoring.service';
import { AEOContentAnalyzerService } from '../../crawler/services/aeo-content-analyzer.service';
import { ContentScoreRepository } from '../../crawler/repositories/content-score.repository';
import { PageContent } from '../../crawler/interfaces/rule.interface';
import { PageSignals } from '../../crawler/interfaces/page-signals.interface';
import { PageCategoryType, AnalysisLevel } from '../../crawler/interfaces/page-category.interface';
import { RuleToProcess, StructuredImprovement, RuleProcessingResult } from './sequential-improvement-structured.service';

/**
 * Service responsible for scoring content and validating improvements.
 * Handles score computation, change detection, and result aggregation.
 */
@Injectable()
export class ImprovementScoringService {
  private readonly logger = new Logger(ImprovementScoringService.name);

  constructor(
    private readonly aeoScoringService: AEOScoringService,
    private readonly aeoContentAnalyzerService: AEOContentAnalyzerService,
    private readonly contentScoreRepository: ContentScoreRepository,
  ) {}

  /**
   * Compute content score using the existing scoring system
   */
  async computeContentScore(
    pageUrl: string, 
    content: string, 
    projectId: string,
    title?: string,
    metaDescription?: string
  ): Promise<number> {
    try {
      this.logger.log(`\n========== COMPUTING CONTENT SCORE ==========`);
      this.logger.log(`URL: ${pageUrl}`);
      this.logger.log(`Title: "${title || 'No title'}"`);
      this.logger.log(`Meta Description: "${metaDescription || 'No meta description'}"`);
      this.logger.log(`Content Length: ${content.length} characters`);
      this.logger.log(`Content Preview (first 200 chars): ${content.substring(0, 200)}...`);
      
      // Convert markdown back to HTML for scoring (scoring system expects HTML)
      const htmlContent = this.markdownToHtml(content);
      
      // Create a mock crawled page structure for scoring
      const mockCrawledPage = {
        url: pageUrl,
        html: `<html><head><title>${title || ''}</title><meta name="description" content="${metaDescription || ''}"></head><body>${htmlContent}</body></html>`,
        text: this.stripMarkdown(content), // Plain text version
        title: title || 'Page Magic Content',
        metadata: {
          title: title || 'Page Magic Content',
          description: metaDescription || '',
        },
        contentLength: content.length,
        crawledAt: new Date(),
      };

      // Create a mock project object
      const mockProject = {
        id: projectId,
        _id: projectId,
      };

      // Use the scoring service to compute AEO score
      const pageContent: PageContent = {
        url: pageUrl,
        html: mockCrawledPage.html,
        cleanContent: content,
        metadata: mockCrawledPage.metadata,
        pageSignals: {} as PageSignals, // Will be populated by the scoring service
        pageCategory: {
          type: PageCategoryType.UNKNOWN,
          confidence: 1,
          analysisLevel: AnalysisLevel.PARTIAL,
        },
      };
      
      const score = await this.aeoScoringService.calculateScore(pageUrl, pageContent);
      
      this.logger.log(`Computed Score: ${score.globalScore || 0}`);
      this.logger.log(`Dimension Scores: Technical=${score.categoryScores?.technical?.score}, Structure=${score.categoryScores?.structure?.score}, Authority=${score.categoryScores?.authority?.score}, Quality=${score.categoryScores?.quality?.score}`);
      this.logger.log(`========== END CONTENT SCORE ==========\n`);
      
      // Return the overall score
      return score.globalScore || 0;
    } catch (error) {
      this.logger.error(`Error computing content score: ${error.message}`);
      // Return a default score in case of error
      return 65;
    }
  }

  /**
   * Convert Markdown back to HTML for scoring
   */
  markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convert bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Convert lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convert numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Convert paragraphs
    html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('\n');
    
    return html;
  }

  /**
   * Strip Markdown formatting to get plain text
   */
  private stripMarkdown(markdown: string): string {
    let text = markdown;
    
    // Remove headers
    text = text.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold and italic
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');
    
    // Remove links
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`(.+?)`/g, '$1');
    
    // Remove list markers
    text = text.replace(/^[\-\*\+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    
    return text.trim();
  }

  /**
   * Detect changes between improvements and original content
   */
  detectChanges(
    improvement: StructuredImprovement,
    originalContent: string,
    originalTitle: string,
    originalMetas: any
  ): string[] {
    const changes: string[] = [];

    if (improvement.content && improvement.content !== originalContent) {
      const contentLengthChange = improvement.content.length - originalContent.length;
      changes.push(`Updated content (${contentLengthChange > 0 ? '+' : ''}${contentLengthChange} characters)`);
    }

    if (improvement.title && improvement.title !== originalTitle) {
      changes.push(`Changed title from "${originalTitle}" to "${improvement.title}"`);
    }

    if (improvement.metas?.description && improvement.metas.description !== originalMetas?.description) {
      changes.push(`Updated meta description`);
    }

    if (improvement.metas?.keywords && improvement.metas.keywords !== originalMetas?.keywords) {
      changes.push(`Updated meta keywords`);
    }

    return changes;
  }

  /**
   * Log detailed evidence about rule scoring
   */
  async logRuleEvidence(
    rule: RuleToProcess,
    projectId: string,
    pageUrl: string,
    scoreBefore: number,
    scoreAfter: number,
    contentScoreId?: string
  ): Promise<void> {
    try {
      this.logger.log(`\n========== RULE EVIDENCE LOG ==========`);
      this.logger.log(`Rule: ${rule.ruleName || rule.description}`);
      this.logger.log(`Dimension: ${rule.dimension}`);
      this.logger.log(`Score Change: ${scoreBefore} → ${scoreAfter}`);
      
      if (contentScoreId) {
        // Fetch the content score document to get detailed evidence
        const contentScore = await this.contentScoreRepository.findById(contentScoreId);
        
        if (contentScore && contentScore.issues) {
          const relevantIssue = contentScore.issues.find(
            issue => issue.ruleId === rule.ruleId || issue.description === rule.description
          );
          
          if (relevantIssue) {
            this.logger.log(`\nDetailed Evidence:`);
            this.logger.log(`- Rule ID: ${relevantIssue.ruleId}`);
            this.logger.log(`- Affected Elements: ${relevantIssue.affectedElements?.join(', ') || 'None'}`);
          } else {
            this.logger.log(`No specific evidence found for rule ${rule.ruleId} in content score document`);
          }
        }
      }
      
      // Log the specific elements that were supposed to be fixed
      if (rule.affectedElements && rule.affectedElements.length > 0) {
        this.logger.log(`\nAffected Elements that should have been addressed:`);
        rule.affectedElements.forEach(element => {
          this.logger.log(`- ${element}`);
        });
      }
      
      this.logger.log(`========== END RULE EVIDENCE ==========\n`);
    } catch (error) {
      this.logger.error(`Error logging rule evidence: ${error.message}`);
    }
  }

  /**
   * Merge previous improvements into current content
   */
  mergeImprovements(
    currentImprovement: StructuredImprovement,
    currentContent: string,
    currentTitle: string,
    currentMetas: any
  ): {
    content: string;
    title: string;
    metas: any;
  } {
    return {
      content: currentImprovement.content || currentContent,
      title: currentImprovement.title || currentTitle,
      metas: {
        ...currentMetas,
        ...(currentImprovement.metas || {}),
      },
    };
  }

  /**
   * Calculate aggregate score improvement
   */
  calculateAggregateImprovement(results: RuleProcessingResult[]): {
    totalScoreBefore: number;
    totalScoreAfter: number;
    totalChanges: string[];
  } {
    const totalScoreBefore = results.reduce((sum, r) => sum + r.scoreBefore, 0) / results.length;
    const totalScoreAfter = results.reduce((sum, r) => sum + r.scoreAfter, 0) / results.length;
    const totalChanges = results.flatMap(r => r.changes);

    return {
      totalScoreBefore,
      totalScoreAfter,
      totalChanges,
    };
  }
}