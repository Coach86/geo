import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/services/llm.service';
import { ProjectService } from '../../project/services/project.service';
import { LlmProvider } from '../../llm/interfaces/llm-provider.enum';
import { ActionPlanRepository } from '../repositories/action-plan.repository';
import { ActionPlanDocument } from '../schemas/action-plan.schema';
import { BM25IndexService } from './bm25-index.service';
import { VectorIndexService } from './vector-index.service';
import { TextProcessorService } from './text-processor.service';
import { SearchIndexRepository } from '../repositories/search-index.repository';
import { Types } from 'mongoose';

export interface ActionItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'content-gaps' | 'brand-visibility' | 'competitor-analysis' | 'technical-seo' | 'semantic-optimization';
  title: string;
  problem: string;
  solution: string;
  specificContent: string;
  targetPage: string;
  timeline: string;
  completed: boolean;
  estimatedImpact: 'high' | 'medium' | 'low';
  validation?: {
    tested: boolean;
    beforeScore: { bm25: number; vector: number; };
    afterScore: { bm25: number; vector: number; };
    improvement: number;
    affectedQueries: string[];
  };
}

export interface ActionPlan {
  scanId: string;
  projectId: string;
  generatedAt: Date;
  overallScore: {
    current: number;
    projected: number;
  };
  phases: {
    name: string;
    duration: string;
    items: ActionItem[];
  }[];
  totalItems: number;
  estimatedTimeToComplete: string;
}

@Injectable()
export class ActionPlanService {
  private readonly logger = new Logger(ActionPlanService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly projectService: ProjectService,
    private readonly actionPlanRepository: ActionPlanRepository,
    private readonly bm25IndexService: BM25IndexService,
    private readonly vectorIndexService: VectorIndexService,
    private readonly textProcessorService: TextProcessorService,
    private readonly searchIndexRepository: SearchIndexRepository,
  ) {}

  async generateActionPlan(
    scanId: string,
    projectId: string,
    scanResults: any
  ): Promise<ActionPlan> {
    this.logger.log(`🎯 Generating action plan for scan ${scanId}`);

    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Analyze scan results to identify specific issues
    const issues = this.analyzeScanResults(scanResults);
    
    // Generate specific action items for each issue
    const actionItems = await this.generateActionItems(project, issues, scanResults);
    
    // Organize into phases
    const phases = this.organizeIntoPhases(actionItems);
    
    // Calculate projected improvements
    const overallScore = this.calculateProjectedImpact(scanResults, actionItems);

    const actionPlan: ActionPlan = {
      scanId,
      projectId,
      generatedAt: new Date(),
      overallScore,
      phases,
      totalItems: actionItems.length,
      estimatedTimeToComplete: this.calculateTimeToComplete(actionItems),
    };

    this.logger.log(`✅ Generated action plan with ${actionItems.length} items across ${phases.length} phases`);
    
    // Save the action plan immediately
    try {
      const savedPlan = await this.saveActionPlan(projectId, actionPlan);
      this.logger.log(`✅ Action plan saved to database with id: ${savedPlan._id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to save action plan: ${error.message}`, error.stack);
    }
    
    return actionPlan;
  }

  private analyzeScanResults(scanResults: any): any[] {
    const issues = [];

    // Analyze zero-result queries
    if (scanResults.coverageMetrics?.queriesWithNoResults?.length > 0) {
      issues.push({
        type: 'zero-results',
        severity: 'high',
        queries: scanResults.coverageMetrics.queriesWithNoResults,
        count: scanResults.coverageMetrics.queriesWithNoResults.length,
      });
    }

    // Analyze low brand visibility
    const brandQueries = scanResults.queryResults?.filter((q: any) => 
      q.query.toLowerCase().includes(scanResults.projectId) || 
      q.query.toLowerCase().includes('brand')
    ) || [];
    
    if (brandQueries.length > 0) {
      const avgBrandMRR = brandQueries.reduce((sum: number, q: any) => sum + q.mrr.bm25, 0) / brandQueries.length;
      if (avgBrandMRR < 0.5) {
        issues.push({
          type: 'low-brand-visibility',
          severity: 'high',
          avgMRR: avgBrandMRR,
          affectedQueries: brandQueries.map((q: any) => q.query),
        });
      }
    }

    // Analyze vector coverage issues
    if (scanResults.coverageMetrics?.vectorCoverage < 0.3) {
      issues.push({
        type: 'poor-semantic-matching',
        severity: 'high',
        currentCoverage: scanResults.coverageMetrics.vectorCoverage,
        affectedQueries: scanResults.queryResults?.filter((q: any) => q.mrr.vector === 0).map((q: any) => q.query) || [],
      });
    }

    // Analyze competitor comparison performance
    const competitorQueries = scanResults.queryResults?.filter((q: any) => 
      q.query.toLowerCase().includes('vs') || 
      q.query.toLowerCase().includes('comparison') ||
      q.query.toLowerCase().includes('alternative')
    ) || [];

    if (competitorQueries.length > 0) {
      const avgCompetitorMRR = competitorQueries.reduce((sum: number, q: any) => sum + Math.max(q.mrr.bm25, q.mrr.vector), 0) / competitorQueries.length;
      if (avgCompetitorMRR < 0.4) {
        issues.push({
          type: 'weak-competitor-positioning',
          severity: 'medium',
          avgMRR: avgCompetitorMRR,
          affectedQueries: competitorQueries.map((q: any) => q.query),
        });
      }
    }

    return issues;
  }

  private async generateActionItems(project: any, issues: any[], scanResults: any): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];
    let itemId = 1;

    for (const issue of issues) {
      const items = await this.generateSpecificActions(project, issue, scanResults, itemId);
      actionItems.push(...items);
      itemId += items.length;
    }

    return actionItems;
  }

  private async generateSpecificActions(
    project: any,
    issue: any,
    scanResults: any,
    startingId: number
  ): Promise<ActionItem[]> {
    const actions: ActionItem[] = [];

    switch (issue.type) {
      case 'zero-results':
        // Create specific content for each zero-result query
        for (let i = 0; i < Math.min(issue.queries.length, 10); i++) {
          const query = issue.queries[i];
          const contentSuggestion = await this.generateContentSuggestion(project, query);
          
          actions.push({
            id: `action-${startingId + i}`,
            priority: 'high',
            category: 'content-gaps',
            title: `Create content for "${query}"`,
            problem: `Query "${query}" returns no relevant results, indicating missing content opportunity`,
            solution: `Create dedicated content page targeting this query`,
            specificContent: contentSuggestion,
            targetPage: this.suggestPageUrl(query),
            timeline: '1-2 weeks',
            completed: false,
            estimatedImpact: 'high',
          });
        }
        break;

      case 'low-brand-visibility':
        actions.push({
          id: `action-${startingId}`,
          priority: 'high',
          category: 'brand-visibility',
          title: 'Enhance About Us page with brand clarity',
          problem: `Brand queries have low average MRR (${issue.avgMRR.toFixed(2)}), indicating weak brand presence`,
          solution: 'Add clear brand definition and value proposition to About Us page',
          specificContent: await this.generateContentSuggestion(project, `What is ${project.brandName}`),
          targetPage: '/about-us or /about',
          timeline: '1 week',
          completed: false,
          estimatedImpact: 'high',
        });

        actions.push({
          id: `action-${startingId + 1}`,
          priority: 'high',
          category: 'brand-visibility',
          title: 'Optimize homepage for brand queries',
          problem: 'Homepage lacks clear brand positioning for AI assistants',
          solution: 'Add prominent brand description and key differentiators',
          specificContent: await this.generateContentSuggestion(project, `${project.brandName} homepage introduction`),
          targetPage: '/ (homepage)',
          timeline: '1 week',
          completed: false,
          estimatedImpact: 'high',
        });
        break;

      case 'poor-semantic-matching':
        actions.push({
          id: `action-${startingId}`,
          priority: 'high',
          category: 'semantic-optimization',
          title: 'Enhance content with semantic richness',
          problem: `Vector coverage is only ${(issue.currentCoverage * 100).toFixed(1)}%, indicating poor semantic matching`,
          solution: 'Add synonym-rich, contextual content that helps AI understand relevance',
          specificContent: await this.generateContentSuggestion(project, `${project.industry} services explained`),
          targetPage: 'All main service pages',
          timeline: '2-3 weeks',
          completed: false,
          estimatedImpact: 'high',
        });
        break;

      case 'weak-competitor-positioning':
        if (project.competitors && project.competitors.length > 0) {
          actions.push({
            id: `action-${startingId}`,
            priority: 'medium',
            category: 'competitor-analysis',
            title: `Create comparison pages for top competitors`,
            problem: `Competitor comparison queries have low average MRR (${issue.avgMRR.toFixed(2)})`,
            solution: 'Create dedicated comparison pages highlighting competitive advantages',
            specificContent: await this.generateContentSuggestion(project, `${project.brandName} vs ${project.competitors[0]}`),
            targetPage: `/compare/${project.competitors[0].toLowerCase().replace(/\s+/g, '-')}`,
            timeline: '2-3 weeks',
            completed: false,
            estimatedImpact: 'medium',
          });
        }
        break;
    }

    return actions;
  }

  private async generateContentSuggestion(project: any, query: string): Promise<string> {
    const prompt = `Write website content for the query: "${query}"

Company: ${project.brandName}
Industry: ${project.industry}
Description: ${project.shortDescription || project.fullDescription || ''}

Instructions:
- Write ONLY the final content text that will appear on the website
- NO formatting instructions, NO HTML, NO markdown
- NO meta-commentary like "Title:" or "Section 1:"
- Just write natural, flowing content as if it's already on the website
- Include the brand name ${project.brandName} naturally throughout
- Make it comprehensive (300-400 words)
- IMPORTANT: Write the entire content in ${project.language || 'English'} language

Start directly with the content.`;

    try {
      const response = await this.llmService.call(
        LlmProvider.OpenAILangChain,
        prompt,
        {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 500,
        }
      );

      return response.text;
    } catch (error) {
      this.logger.error(`Failed to generate content suggestion: ${error.message}`);
      // Return generic fallback - ask LLM to generate in correct language next time
      return `[Content for "${query}" - Please regenerate for proper ${project.language || 'English'} content]

${project.brandName} - ${project.shortDescription || project.industry}

[This is placeholder content. Please regenerate the action plan to get properly formatted content in ${project.language || 'English'}.]`;
    }
  }

  private suggestPageUrl(query: string): string {
    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `/${slug}`;
  }

  private organizeIntoPhases(actionItems: ActionItem[]): any[] {
    const phases = [
      {
        name: 'Phase 1: Immediate Quick Wins',
        duration: '1-2 weeks',
        items: actionItems.filter(item => 
          item.priority === 'high' && 
          (item.category === 'content-gaps' || item.category === 'brand-visibility')
        ),
      },
      {
        name: 'Phase 2: Technical & Semantic Optimization',
        duration: '2-3 weeks',
        items: actionItems.filter(item => 
          item.category === 'technical-seo' || item.category === 'semantic-optimization'
        ),
      },
      {
        name: 'Phase 3: Competitive Positioning',
        duration: '3-4 weeks',
        items: actionItems.filter(item => 
          item.category === 'competitor-analysis'
        ),
      },
    ];

    // Add remaining items to appropriate phases
    const assignedItems = new Set();
    phases.forEach(phase => {
      phase.items.forEach(item => assignedItems.add(item.id));
    });

    const unassignedItems = actionItems.filter(item => !assignedItems.has(item.id));
    if (unassignedItems.length > 0) {
      phases[0].items.push(...unassignedItems.filter(item => item.priority === 'high'));
      phases[1].items.push(...unassignedItems.filter(item => item.priority === 'medium'));
      phases[2].items.push(...unassignedItems.filter(item => item.priority === 'low'));
    }

    return phases.filter(phase => phase.items.length > 0);
  }

  private calculateProjectedImpact(scanResults: any, actionItems: ActionItem[]): any {
    const currentScore = (scanResults.coverageMetrics?.bm25Coverage || 0) + 
                       (scanResults.coverageMetrics?.vectorCoverage || 0);
    
    // Estimate improvement based on action items
    const highImpactItems = actionItems.filter(item => item.estimatedImpact === 'high').length;
    const mediumImpactItems = actionItems.filter(item => item.estimatedImpact === 'medium').length;
    
    const projectedImprovement = (highImpactItems * 0.15) + (mediumImpactItems * 0.08);
    const projectedScore = Math.min(currentScore + projectedImprovement, 1.8); // Cap at 90% each

    return {
      current: Math.round(currentScore * 100) / 100,
      projected: Math.round(projectedScore * 100) / 100,
    };
  }

  private calculateTimeToComplete(actionItems: ActionItem[]): string {
    const totalWeeks = actionItems.reduce((sum, item) => {
      const weeks = parseInt(item.timeline.split('-')[0]) || 1;
      return sum + weeks;
    }, 0);

    if (totalWeeks <= 4) return `${totalWeeks} weeks`;
    if (totalWeeks <= 8) return `${Math.ceil(totalWeeks / 4)} months`;
    return `${Math.ceil(totalWeeks / 12)} quarters`;
  }

  async validateActionItem(
    projectId: string,
    actionItem: ActionItem,
    relatedQueries: string[],
    scanResults?: any
  ): Promise<ActionItem> {
    this.logger.log(`🔍 Validating action item: ${actionItem.id} with ${relatedQueries.length} queries`);

    try {
      // Create a mock page document for processing
      const mockPage = {
        url: actionItem.targetPage,
        title: actionItem.title,
        content: actionItem.specificContent,
        _id: `validation-${actionItem.id}`,
      } as any;
      
      // Process the suggested content into chunks like a real page would be
      const contentChunks = await this.textProcessorService.processPages([mockPage]);

      // Test each related query before and after the proposed content
      const beforeScores: { bm25: number[]; vector: number[] } = { bm25: [], vector: [] };
      const afterScores: { bm25: number[]; vector: number[] } = { bm25: [], vector: [] };

      for (const query of relatedQueries.slice(0, 5)) { // Test up to 5 queries
        // Get before scores from scan results if available
        let beforeBm25MRR = 0;
        let beforeVectorMRR = 0;
        
        if (scanResults?.queryResults) {
          const queryResult = scanResults.queryResults.find((q: any) => q.query === query);
          if (queryResult) {
            beforeBm25MRR = queryResult.mrr?.bm25 || 0;
            beforeVectorMRR = queryResult.mrr?.vector || 0;
          }
        }
        
        beforeScores.bm25.push(beforeBm25MRR);
        beforeScores.vector.push(beforeVectorMRR);

        // Perform actual searches with the new content included
        const afterResults = await this.performValidationSearch(
          projectId,
          query,
          contentChunks,
          actionItem.targetPage
        );
        
        this.logger.debug(`Query: "${query}" - After BM25 MRR: ${afterResults.bm25MRR}, After Vector MRR: ${afterResults.vectorMRR}`);
        
        afterScores.bm25.push(afterResults.bm25MRR);
        afterScores.vector.push(afterResults.vectorMRR);
      }

      // Calculate average scores
      const avgBeforeBm25 = beforeScores.bm25.reduce((a, b) => a + b, 0) / beforeScores.bm25.length || 0;
      const avgBeforeVector = beforeScores.vector.reduce((a, b) => a + b, 0) / beforeScores.vector.length || 0;
      const avgAfterBm25 = afterScores.bm25.reduce((a, b) => a + b, 0) / afterScores.bm25.length || 0;
      const avgAfterVector = afterScores.vector.reduce((a, b) => a + b, 0) / afterScores.vector.length || 0;

      const improvement = ((avgAfterBm25 + avgAfterVector) / 2) - ((avgBeforeBm25 + avgBeforeVector) / 2);

      this.logger.log(`✅ Validation complete for ${actionItem.id}:`);
      this.logger.log(`   Before - BM25: ${(avgBeforeBm25 * 100).toFixed(1)}%, Vector: ${(avgBeforeVector * 100).toFixed(1)}%`);
      this.logger.log(`   After  - BM25: ${(avgAfterBm25 * 100).toFixed(1)}%, Vector: ${(avgAfterVector * 100).toFixed(1)}%`);
      this.logger.log(`   Improvement: +${(improvement * 100).toFixed(1)}%`);

      // Add validation results to the action item
      return {
        ...actionItem,
        validation: {
          tested: true,
          beforeScore: { bm25: avgBeforeBm25, vector: avgBeforeVector },
          afterScore: { bm25: avgAfterBm25, vector: avgAfterVector },
          improvement: improvement,
          affectedQueries: relatedQueries.slice(0, 5),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to validate action item: ${error.message}`);
      return actionItem; // Return original item if validation fails
    }
  }

  private async performValidationSearch(
    projectId: string,
    query: string,
    newContentChunks: any[],
    targetUrl: string
  ): Promise<{ bm25MRR: number; vectorMRR: number }> {
    try {
      // Find the BM25 and Vector indexes for this project
      const bm25Index = await this.searchIndexRepository.findByProjectAndType(projectId, 'bm25');
      const vectorIndex = await this.searchIndexRepository.findByProjectAndType(projectId, 'vector');
      
      if (!bm25Index || !vectorIndex) {
        this.logger.warn(`Missing indexes for project ${projectId}`);
        return { bm25MRR: 0.3, vectorMRR: 0.2 };
      }

      // Perform actual searches to get current rankings
      const bm25Results = await this.bm25IndexService.search(bm25Index._id as Types.ObjectId, query, 10);
      const vectorResults = await this.vectorIndexService.search(vectorIndex._id as Types.ObjectId, query, 10);
      
      // Calculate current MRR for this URL (before adding new content)
      const currentBm25MRR = this.calculateMRRForUrl(bm25Results, targetUrl);
      const currentVectorMRR = this.calculateMRRForUrl(vectorResults, targetUrl);
      
      // Calculate how well the new content would match this specific query
      const newContentScore = this.calculateNewContentRelevance(newContentChunks, query);
      
      // Estimate new rankings if content was added
      // If new content has good relevance, it should rank well
      let projectedBm25MRR = currentBm25MRR;
      let projectedVectorMRR = currentVectorMRR;
      
      if (newContentScore.bm25 > 0.3) {
        // Content has good keyword relevance - likely to rank in top 3
        projectedBm25MRR = Math.max(currentBm25MRR, 1/3); // At least position 3
        if (newContentScore.bm25 > 0.6) {
          projectedBm25MRR = Math.max(currentBm25MRR, 1/1); // Position 1 for very relevant content
        } else if (newContentScore.bm25 > 0.45) {
          projectedBm25MRR = Math.max(currentBm25MRR, 1/2); // Position 2 for good content
        }
      }
      
      if (newContentScore.vector > 0.2) {
        // Content has good semantic relevance
        projectedVectorMRR = Math.max(currentVectorMRR, 1/5); // At least position 5
        if (newContentScore.vector > 0.5) {
          projectedVectorMRR = Math.max(currentVectorMRR, 1/2); // Position 2 for very relevant
        } else if (newContentScore.vector > 0.35) {
          projectedVectorMRR = Math.max(currentVectorMRR, 1/3); // Position 3 for good content
        }
      }
      
      return { 
        bm25MRR: projectedBm25MRR, 
        vectorMRR: projectedVectorMRR 
      };
    } catch (error) {
      this.logger.error(`Error performing validation search: ${error.message}`);
      // Return conservative estimates if search fails
      return { bm25MRR: 0.5, vectorMRR: 0.3 };
    }
  }


  private calculateNewContentRelevance(
    chunks: any[],
    query: string
  ): { bm25: number; vector: number } {
    const allContent = chunks.map(c => c.content || '').join(' ').toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    
    // BM25-style scoring: count how many query terms appear in content
    let bm25Score = 0;
    let foundTerms = 0;
    
    queryTerms.forEach(term => {
      const matches = (allContent.match(new RegExp(`\\b${term}\\b`, 'gi')) || []).length;
      if (matches > 0) {
        foundTerms++;
        bm25Score += Math.min(matches, 3) * (term.length / 10); // Weight by term length
      }
    });
    
    const bm25Relevance = queryTerms.length > 0 ? foundTerms / queryTerms.length : 0;
    
    // Vector-style scoring: semantic patterns (basic heuristics)
    let vectorScore = bm25Relevance * 0.5; // Base score from term matching
    
    // Add points for content length (longer content usually more comprehensive)
    if (allContent.length > 500) vectorScore += 0.1;
    if (allContent.length > 1000) vectorScore += 0.1;
    
    // Simple semantic patterns (no hardcoded languages)
    const contentWords = allContent.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    
    // Check for related concepts appearing together
    let semanticMatches = 0;
    queryWords.forEach(qWord => {
      contentWords.forEach(cWord => {
        if (qWord.length > 3 && cWord.length > 3 && 
            (qWord.includes(cWord) || cWord.includes(qWord))) {
          semanticMatches++;
        }
      });
    });
    
    if (semanticMatches > 0) {
      vectorScore += Math.min(semanticMatches / (queryWords.length * 2), 0.3);
    }
    
    return {
      bm25: Math.min(1, bm25Relevance),
      vector: Math.min(1, vectorScore)
    };
  }

  private calculateMRRForUrl(results: any[], targetUrl: string): number {
    const position = results.findIndex(r => r.url === targetUrl) + 1;
    if (position === 0) return 0; // Not found
    return 1 / position;
  }

  async validateAllActionItems(
    projectId: string,
    actionPlan: ActionPlan,
    scanResults: any
  ): Promise<ActionPlan> {
    this.logger.log(`🔍 Validating all action items for plan ${actionPlan.scanId}`);

    const validatedPlan = { ...actionPlan };
    
    for (let phaseIndex = 0; phaseIndex < validatedPlan.phases.length; phaseIndex++) {
      const phase = validatedPlan.phases[phaseIndex];
      
      for (let itemIndex = 0; itemIndex < phase.items.length; itemIndex++) {
        const item = phase.items[itemIndex];
        
        // Find related queries based on the issue type
        const relatedQueries = this.findRelatedQueries(item, scanResults);
        
        if (relatedQueries.length > 0) {
          const validatedItem = await this.validateActionItem(projectId, item, relatedQueries, scanResults);
          validatedPlan.phases[phaseIndex].items[itemIndex] = validatedItem;
        }
      }
    }

    // Update the saved action plan with validation results
    try {
      await this.saveActionPlan(projectId, validatedPlan);
      this.logger.log(`✅ Updated action plan with validation results`);
    } catch (error) {
      this.logger.error(`Failed to update action plan with validation: ${error.message}`);
    }

    return validatedPlan;
  }

  private findRelatedQueries(item: ActionItem, scanResults: any): string[] {
    const queries: string[] = [];
    this.logger.debug(`Finding related queries for ${item.category} action: ${item.title}`);

    switch (item.category) {
      case 'content-gaps':
        // For content gaps, find the SPECIFIC query this item is meant to address
        const targetQuery = this.extractTargetQueryFromTitle(item.title);
        if (targetQuery) {
          queries.push(targetQuery);
          
          // Add a few related queries from the zero-results list if available
          if (scanResults.coverageMetrics?.queriesWithNoResults) {
            const relatedQueries = scanResults.coverageMetrics.queriesWithNoResults
              .filter((q: string) => {
                const qLower = q.toLowerCase();
                const targetLower = targetQuery.toLowerCase();
                // Find queries that share keywords but aren't identical
                const targetWords = targetLower.split(/\s+/).filter(w => w.length > 3);
                const sharedWords = targetWords.filter(word => qLower.includes(word));
                return sharedWords.length > 0 && q !== targetQuery;
              })
              .slice(0, 4); // Add up to 4 related queries
            
            queries.push(...relatedQueries);
          }
        } else {
          // Fallback to generic zero-result queries if we can't extract the target
          if (scanResults.coverageMetrics?.queriesWithNoResults) {
            queries.push(...scanResults.coverageMetrics.queriesWithNoResults.slice(0, 5));
          }
        }
        break;
        
      case 'brand-visibility':
        // Find brand-related queries
        if (scanResults.queryResults) {
          const brandQueries = scanResults.queryResults
            .filter((q: any) => 
              q.query.toLowerCase().includes('brand') || 
              q.query.toLowerCase().includes(scanResults.projectId?.toLowerCase() || '')
            )
            .map((q: any) => q.query);
          queries.push(...brandQueries);
        }
        break;
        
      case 'semantic-optimization':
        // Find queries with low vector scores
        if (scanResults.queryResults) {
          const lowVectorQueries = scanResults.queryResults
            .filter((q: any) => q.mrr.vector < 0.3)
            .map((q: any) => q.query);
          queries.push(...lowVectorQueries);
        }
        break;
        
      case 'competitor-analysis':
        // Find competitor comparison queries
        if (scanResults.queryResults) {
          const competitorQueries = scanResults.queryResults
            .filter((q: any) => 
              q.query.toLowerCase().includes('vs') || 
              q.query.toLowerCase().includes('comparison') ||
              q.query.toLowerCase().includes('alternative')
            )
            .map((q: any) => q.query);
          queries.push(...competitorQueries);
        }
        break;
    }

    const uniqueQueries = [...new Set(queries)]; // Remove duplicates
    this.logger.debug(`Found ${uniqueQueries.length} related queries for ${item.title}: ${uniqueQueries.join(', ')}`);
    return uniqueQueries;
  }

  private extractTargetQueryFromTitle(title: string): string | null {
    // Extract query from titles like 'Create content for "Some Query"'
    const match = title.match(/Create content for "([^"]+)"/);
    return match ? match[1] : null;
  }

  async saveActionPlan(projectId: string, actionPlan: ActionPlan): Promise<ActionPlanDocument> {
    this.logger.log(`💾 Saving action plan for project ${projectId}, scanId: ${actionPlan.scanId}`);
    this.logger.log(`Project ID type: ${typeof projectId}, value: ${projectId}`);
    
    try {
      // Check if an action plan already exists for this scan
      const existing = await this.actionPlanRepository.findByProjectAndScan(
        projectId,
        actionPlan.scanId
      );
      
      if (existing) {
        this.logger.log(`Updating existing action plan for scan ${actionPlan.scanId}`);
        // Update the existing plan
        existing.overallScore = actionPlan.overallScore;
        existing.phases = actionPlan.phases;
        existing.totalItems = actionPlan.totalItems;
        existing.estimatedTimeToComplete = actionPlan.estimatedTimeToComplete;
        existing.lastModifiedAt = new Date();
        const saved = await existing.save();
        this.logger.log(`✅ Updated action plan saved successfully`);
        return saved;
      } else {
        // Create new action plan
        this.logger.log(`Creating new action plan with data:`, {
          projectId,
          scanId: actionPlan.scanId,
          totalItems: actionPlan.totalItems,
          phasesCount: actionPlan.phases.length,
        });
        
        const saved = await this.actionPlanRepository.create({
          ...actionPlan,
          projectId,
        });
        
        this.logger.log(`✅ New action plan saved successfully with id: ${saved._id}`);
        return saved;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to save action plan: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActionPlan(projectId: string, scanId: string): Promise<ActionPlan | null> {
    this.logger.log(`🔍 Retrieving action plan for project ${projectId}, scan ${scanId}`);
    
    try {
      const actionPlan = await this.actionPlanRepository.findByProjectAndScan(
        projectId,
        scanId
      );
      
      if (!actionPlan) {
        this.logger.log(`No action plan found for project ${projectId}, scan ${scanId}`);
        
        // Let's check what action plans exist for this project
        const allPlans = await this.actionPlanRepository.findAllByProject(projectId);
        this.logger.log(`Found ${allPlans.length} action plans for project ${projectId}`);
        if (allPlans.length > 0) {
          this.logger.log(`Existing action plans have scanIds: ${allPlans.map(p => p.scanId).join(', ')}`);
        }
        
        return null;
      }
      
      this.logger.log(`✅ Found action plan with ${actionPlan.totalItems} items`);
      return this.documentToActionPlan(actionPlan);
    } catch (error) {
      this.logger.error(`Error retrieving action plan: ${error.message}`);
      return null;
    }
  }

  async getLatestActionPlan(projectId: string): Promise<ActionPlan | null> {
    this.logger.log(`🔍 Retrieving latest action plan for project ${projectId}`);
    
    const actionPlan = await this.actionPlanRepository.findLatestByProject(projectId);
    
    if (!actionPlan) {
      this.logger.log(`No action plans found for project ${projectId}`);
      return null;
    }
    
    return this.documentToActionPlan(actionPlan);
  }

  async updateActionItemStatus(
    projectId: string,
    scanId: string,
    itemId: string,
    completed: boolean
  ): Promise<ActionPlan | null> {
    this.logger.log(`📝 Updating action item ${itemId} status to ${completed}`);
    
    const updated = await this.actionPlanRepository.updateCompletedItems(
      projectId,
      scanId,
      itemId,
      completed
    );
    
    if (!updated) {
      this.logger.error(`Failed to update action item ${itemId}`);
      return null;
    }
    
    return this.documentToActionPlan(updated);
  }

  private documentToActionPlan(doc: ActionPlanDocument): ActionPlan {
    return {
      scanId: doc.scanId,
      projectId: doc.projectId,
      generatedAt: doc.generatedAt,
      overallScore: doc.overallScore,
      phases: doc.phases.map(phase => ({
        name: phase.name,
        duration: phase.duration,
        items: phase.items.map(item => ({
          ...item,
          category: item.category as ActionItem['category'],
        })),
      })),
      totalItems: doc.totalItems,
      estimatedTimeToComplete: doc.estimatedTimeToComplete,
    };
  }
}