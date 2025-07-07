import { Injectable, Logger } from '@nestjs/common';
import { AEORuleRegistryService } from './aeo-rule-registry.service';
import { PageCategorizerService } from './page-categorizer.service';
import { BaseAEORule as BaseRule } from '../rules/aeo/base-aeo.rule';
import { 
  Score, 
  CategoryScore, 
  Category, 
  PageContent, 
  RuleResult,
  PageApplicability,
  Recommendation 
} from '../interfaces/rule.interface';
import { EvidenceHelper } from '../utils/evidence.helper';

@Injectable()
export class AEOScoringService {
  private readonly logger = new Logger(AEOScoringService.name);

  constructor(
    private readonly ruleRegistry: AEORuleRegistryService,
    private readonly pageCategorizer: PageCategorizerService
  ) {}

  async calculateScore(url: string, content: PageContent): Promise<Score> {
    const startTime = Date.now();
    this.logger.debug(`Calculating AEO score for ${url}`);
    
    // Classify page type
    const pageCategory = await this.pageCategorizer.categorize(url, content.html || '', content.metadata);
    const pageType = pageCategory.type;
    this.logger.debug(`Page classified as: ${pageType} with confidence ${pageCategory.confidence}`);
    
    // Get applicable rules for this page
    const applicableRules = this.ruleRegistry.getRulesForUrl(url, pageType as keyof PageApplicability);
    this.logger.debug(`Found ${applicableRules.length} applicable rules`);
    
    // Group rules by category
    const rulesByCategory = this.groupRulesByCategory(applicableRules);
    
    // Execute rules by category in parallel
    this.logger.debug(`Executing ${Object.keys(rulesByCategory).length} categories in parallel`);
    const categoryPromises = Object.entries(rulesByCategory).map(async ([category, rules]) => {
      const categoryStartTime = Date.now();
      const categoryScore = await this.executeCategoryRules(category as Category, rules, url, content);
      this.logger.debug(`Category ${category} completed in ${Date.now() - categoryStartTime}ms with ${rules.length} rules`);
      return { category: category.toLowerCase(), score: categoryScore };
    });
    
    // Wait for all categories to complete
    const categoryResults = await Promise.all(categoryPromises);
    
    // Build categoryScores object from results
    const categoryScores: Record<string, CategoryScore> = {};
    categoryResults.forEach(({ category, score }) => {
      categoryScores[category] = score;
    });
    
    // Ensure all categories have scores (even if no rules applied)
    const allCategories: Category[] = ['TECHNICAL', 'STRUCTURE', 'AUTHORITY', 'QUALITY'];
    for (const category of allCategories) {
      const key = category.toLowerCase();
      if (!categoryScores[key]) {
        categoryScores[key] = this.createEmptyCategoryScore(category);
      }
    }
    
    // Calculate global score
    const globalScore = this.calculateGlobalScore(categoryScores);
    
    // Count issues
    let totalIssues = 0;
    let criticalIssues = 0;
    
    Object.values(categoryScores).forEach(categoryScore => {
      categoryScore.ruleResults.forEach(result => {
        if (result.issues) {
          totalIssues += result.issues.length;
          criticalIssues += result.issues.filter(i => i.severity === 'critical').length;
        }
      });
    });
    
    const totalTime = Date.now() - startTime;
    this.logger.log(`AEO scoring completed for ${url} in ${totalTime}ms - Global Score: ${globalScore}, Total Rules: ${applicableRules.length}`);
    
    return {
      url,
      pageType,
      timestamp: new Date(),
      categoryScores: {
        technical: categoryScores['technical'],
        structure: categoryScores['structure'],
        authority: categoryScores['authority'],
        quality: categoryScores['quality']
      },
      globalScore,
      totalIssues,
      criticalIssues
    };
  }

  private groupRulesByCategory(rules: BaseRule[]): Record<Category, BaseRule[]> {
    const grouped: Record<string, BaseRule[]> = {};
    
    rules.forEach(rule => {
      if (!grouped[rule.category]) {
        grouped[rule.category] = [];
      }
      grouped[rule.category].push(rule);
    });
    
    return grouped as Record<Category, BaseRule[]>;
  }

  private async executeCategoryRules(
    category: Category, 
    rules: BaseRule[], 
    url: string,
    content: PageContent
  ): Promise<CategoryScore> {
    const issues: string[] = [];
    const uniqueRecommendations = new Map<string, Recommendation>();
    
    // Execute all rules in parallel
    this.logger.debug(`Executing ${rules.length} ${category} rules in parallel`);
    const rulePromises = rules.map(async (rule) => {
      const ruleStartTime = Date.now();
      try {
        const result = await rule.evaluate(url, content);
        this.logger.debug(`Rule ${rule.id} completed in ${Date.now() - ruleStartTime}ms`);
        return result;
      } catch (error) {
        this.logger.error(`Error executing rule ${rule.id}: ${error.message}`);
        // Return a failed result
        return {
          ruleId: rule.id,
          ruleName: rule.name,
          score: 0,
          maxScore: 100,
          weight: 1,
          contribution: 0,
          passed: false,
          evidence: [EvidenceHelper.error('Error', `Error executing rule: ${error.message}`)],
          details: { error: error.message }
        };
      }
    });
    
    // Wait for all rules to complete
    const ruleResults = await Promise.all(rulePromises);
    
    // Collect unique issues and recommendations from all results
    ruleResults.forEach(result => {
      if (result.issues) {
        result.issues.forEach((issue: any) => {
          if (!issues.includes(issue.description)) {
            issues.push(issue.description);
          }
          // Create recommendation object from issue
          const recommendationKey = `${result.ruleId}-${issue.recommendation}`;
          if (!uniqueRecommendations.has(recommendationKey)) {
            uniqueRecommendations.set(recommendationKey, {
              content: issue.recommendation,
              ruleId: result.ruleId,
              ruleCategory: category
            });
          }
        });
      }
      
      // Also process recommendations array if present
      if (result.recommendations) {
        result.recommendations.forEach((rec: string) => {
          const recommendationKey = `${result.ruleId}-${rec}`;
          if (!uniqueRecommendations.has(recommendationKey)) {
            uniqueRecommendations.set(recommendationKey, {
              content: rec,
              ruleId: result.ruleId,
              ruleCategory: category
            });
          }
        });
      }
    });
    
    // Convert Map values to array
    const recommendations = Array.from(uniqueRecommendations.values());
    
    // Calculate category score
    const categoryWeight = this.getCategoryWeight(category);
    const { score, passedRules } = this.calculateCategoryScore(ruleResults);
    
    return {
      category,
      score,
      weight: categoryWeight,
      appliedRules: ruleResults.length,
      passedRules,
      ruleResults,
      issues,
      recommendations
    };
  }

  private createEmptyCategoryScore(category: Category): CategoryScore {
    return {
      category,
      score: 0,
      weight: this.getCategoryWeight(category),
      appliedRules: 0,
      passedRules: 0,
      ruleResults: [],
      issues: [],
      recommendations: []
    };
  }

  private calculateCategoryScore(ruleResults: RuleResult[]): { score: number; passedRules: number } {
    if (ruleResults.length === 0) {
      return { score: 0, passedRules: 0 };
    }
    
    let totalContribution = 0;
    let totalWeight = 0;
    let passedRules = 0;
    
    ruleResults.forEach(result => {
      totalContribution += result.contribution;
      totalWeight += result.weight;
      if (result.passed) {
        passedRules++;
      }
    });
    
    const score = totalWeight > 0 ? Math.round((totalContribution / totalWeight) * 100) : 0;
    
    return { score, passedRules };
  }

  private getCategoryWeight(category: Category): number {
    const weights = this.ruleRegistry.getCategoryWeights();
    return weights[category] || 1.0;
  }

  private calculateGlobalScore(categoryScores: Record<string, CategoryScore>): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.values(categoryScores).forEach(categoryScore => {
      if (categoryScore.appliedRules > 0) {
        weightedSum += categoryScore.score * categoryScore.weight;
        totalWeight += categoryScore.weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  generateRecommendations(score: Score): Recommendation[] {
    const uniqueRecommendations = new Map<string, Recommendation>();
    
    // Collect recommendations from all categories
    Object.values(score.categoryScores).forEach(categoryScore => {
      categoryScore.recommendations.forEach(rec => {
        const key = `${rec.ruleId}-${rec.content}`;
        if (!uniqueRecommendations.has(key)) {
          uniqueRecommendations.set(key, rec);
        }
      });
    });
    
    // Convert to array and sort by category priority
    const categoryPriority: Record<string, number> = {
      'TECHNICAL': 1,
      'CONTENT': 2,
      'AUTHORITY': 3,
      'MONITORING_KPI': 4
    };
    
    return Array.from(uniqueRecommendations.values()).sort((a, b) => {
      const aPriority = categoryPriority[a.ruleCategory] || 999;
      const bPriority = categoryPriority[b.ruleCategory] || 999;
      return aPriority - bPriority;
    });
  }
}