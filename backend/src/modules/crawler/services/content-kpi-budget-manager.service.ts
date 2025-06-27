import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BudgetConfig {
  maxCostPerPage: number;
  maxCrawlCost: number;
  enableBudgetManager: boolean;
  dailyBudgetLimit?: number;
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  modelUsed: string;
}

export interface BudgetStatus {
  currentSpend: number;
  remainingBudget: number;
  pagesAnalyzed: number;
  avgCostPerPage: number;
  canProceed: boolean;
  reason?: string;
}

@Injectable()
export class ContentKPIBudgetManagerService {
  private readonly logger = new Logger(ContentKPIBudgetManagerService.name);
  private currentSessionSpend = 0;
  private pagesAnalyzedCount = 0;
  private readonly config: BudgetConfig;

  // Token costs per 1K tokens (as of 2024)
  private readonly TOKEN_COSTS: Record<string, { input: number; output: number }> = {
    'gpt-3.5-turbo-0125': {
      input: 0.0005, // $0.50 per 1M input tokens
      output: 0.0015, // $1.50 per 1M output tokens
    },
    'gpt-4-turbo-preview': {
      input: 0.01, // $10 per 1M input tokens
      output: 0.03, // $30 per 1M output tokens
    },
    'gpt-4': {
      input: 0.03, // $30 per 1M input tokens
      output: 0.06, // $60 per 1M output tokens
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.config = {
      maxCostPerPage: this.configService.get<number>('CONTENT_KPI_MAX_COST_PAGE', 0.01),
      maxCrawlCost: this.configService.get<number>('CONTENT_KPI_MAX_CRAWL_COST', 5.0),
      enableBudgetManager: this.configService.get<boolean>('CONTENT_KPI_ENABLE_BUDGET_MANAGER', true),
      dailyBudgetLimit: this.configService.get<number>('CONTENT_KPI_DAILY_BUDGET'),
    };

    this.logger.log(`Budget Manager initialized: maxCostPerPage=$${this.config.maxCostPerPage}, maxCrawlCost=$${this.config.maxCrawlCost}`);
  }

  /**
   * Estimate cost before making LLM call
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string = 'gpt-3.5-turbo-0125'): CostEstimate {
    const costs = this.TOKEN_COSTS[model] || this.TOKEN_COSTS['gpt-3.5-turbo-0125'];
    
    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    const estimatedCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      estimatedCost,
      modelUsed: model,
    };
  }

  /**
   * Check if we can proceed with analysis within budget
   */
  canProceedWithAnalysis(estimatedCost: number): BudgetStatus {
    if (!this.config.enableBudgetManager) {
      return {
        currentSpend: this.currentSessionSpend,
        remainingBudget: Infinity,
        pagesAnalyzed: this.pagesAnalyzedCount,
        avgCostPerPage: this.getAverageCostPerPage(),
        canProceed: true,
      };
    }

    // Check per-page cost limit
    if (estimatedCost > this.config.maxCostPerPage) {
      return {
        currentSpend: this.currentSessionSpend,
        remainingBudget: this.config.maxCrawlCost - this.currentSessionSpend,
        pagesAnalyzed: this.pagesAnalyzedCount,
        avgCostPerPage: this.getAverageCostPerPage(),
        canProceed: false,
        reason: `Estimated cost $${estimatedCost.toFixed(4)} exceeds per-page limit $${this.config.maxCostPerPage}`,
      };
    }

    // Check total crawl cost limit
    const projectedTotalCost = this.currentSessionSpend + estimatedCost;
    if (projectedTotalCost > this.config.maxCrawlCost) {
      return {
        currentSpend: this.currentSessionSpend,
        remainingBudget: this.config.maxCrawlCost - this.currentSessionSpend,
        pagesAnalyzed: this.pagesAnalyzedCount,
        avgCostPerPage: this.getAverageCostPerPage(),
        canProceed: false,
        reason: `Projected total cost $${projectedTotalCost.toFixed(4)} exceeds crawl limit $${this.config.maxCrawlCost}`,
      };
    }

    return {
      currentSpend: this.currentSessionSpend,
      remainingBudget: this.config.maxCrawlCost - this.currentSessionSpend,
      pagesAnalyzed: this.pagesAnalyzedCount,
      avgCostPerPage: this.getAverageCostPerPage(),
      canProceed: true,
    };
  }

  /**
   * Record actual cost after LLM call
   */
  recordActualCost(actualCost: number): void {
    this.currentSessionSpend += actualCost;
    this.pagesAnalyzedCount++;
    
    this.logger.debug(`Recorded cost: $${actualCost.toFixed(4)}, Total: $${this.currentSessionSpend.toFixed(4)}, Pages: ${this.pagesAnalyzedCount}`);
    
    // Log warning if approaching limits
    const remainingBudget = this.config.maxCrawlCost - this.currentSessionSpend;
    if (remainingBudget < this.config.maxCrawlCost * 0.1) {
      this.logger.warn(`Budget warning: Only $${remainingBudget.toFixed(4)} remaining (${(remainingBudget / this.config.maxCrawlCost * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Calculate actual cost from LLM response metadata
   */
  calculateActualCost(usage: { inputTokens: number; outputTokens: number }, model: string): number {
    const costs = this.TOKEN_COSTS[model] || this.TOKEN_COSTS['gpt-3.5-turbo-0125'];
    
    const inputCost = (usage.inputTokens / 1000) * costs.input;
    const outputCost = (usage.outputTokens / 1000) * costs.output;
    
    return inputCost + outputCost;
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): BudgetStatus {
    return {
      currentSpend: this.currentSessionSpend,
      remainingBudget: this.config.maxCrawlCost - this.currentSessionSpend,
      pagesAnalyzed: this.pagesAnalyzedCount,
      avgCostPerPage: this.getAverageCostPerPage(),
      canProceed: this.currentSessionSpend < this.config.maxCrawlCost,
    };
  }

  /**
   * Reset budget tracking (for new crawl sessions)
   */
  resetBudget(): void {
    this.logger.log(`Resetting budget. Previous session: $${this.currentSessionSpend.toFixed(4)} for ${this.pagesAnalyzedCount} pages`);
    this.currentSessionSpend = 0;
    this.pagesAnalyzedCount = 0;
  }

  /**
   * Estimate how many more pages can be analyzed with remaining budget
   */
  estimateRemainingPages(): number {
    if (!this.config.enableBudgetManager) {
      return Infinity;
    }

    const remainingBudget = this.config.maxCrawlCost - this.currentSessionSpend;
    const avgCostPerPage = this.getAverageCostPerPage();
    
    if (avgCostPerPage === 0) {
      // No pages analyzed yet, use max cost per page as estimate
      return Math.floor(remainingBudget / this.config.maxCostPerPage);
    }
    
    return Math.floor(remainingBudget / avgCostPerPage);
  }

  /**
   * Check if we're operating within target cost efficiency
   */
  isWithinTargetEfficiency(): boolean {
    const avgCost = this.getAverageCostPerPage();
    const targetCost = 0.003; // Target from revised plan
    
    return avgCost <= targetCost || this.pagesAnalyzedCount < 5; // Allow variance for small samples
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    avgCostPerPage: number;
    totalSpend: number;
    pagesAnalyzed: number;
    budgetUtilization: number;
    efficiency: 'excellent' | 'good' | 'acceptable' | 'poor';
  } {
    const avgCost = this.getAverageCostPerPage();
    const budgetUtilization = this.currentSessionSpend / this.config.maxCrawlCost;
    
    let efficiency: 'excellent' | 'good' | 'acceptable' | 'poor';
    if (avgCost <= 0.003) {
      efficiency = 'excellent';
    } else if (avgCost <= 0.005) {
      efficiency = 'good';
    } else if (avgCost <= 0.01) {
      efficiency = 'acceptable';
    } else {
      efficiency = 'poor';
    }

    return {
      avgCostPerPage: avgCost,
      totalSpend: this.currentSessionSpend,
      pagesAnalyzed: this.pagesAnalyzedCount,
      budgetUtilization,
      efficiency,
    };
  }

  private getAverageCostPerPage(): number {
    return this.pagesAnalyzedCount > 0 ? this.currentSessionSpend / this.pagesAnalyzedCount : 0;
  }

  /**
   * Circuit breaker: temporarily disable analysis if costs are too high
   */
  shouldTriggerCircuitBreaker(): boolean {
    if (!this.config.enableBudgetManager) {
      return false;
    }

    // Trigger if average cost is >5x target and we've analyzed >3 pages
    const avgCost = this.getAverageCostPerPage();
    const targetCost = 0.003;
    
    return this.pagesAnalyzedCount > 3 && avgCost > (targetCost * 5);
  }
}