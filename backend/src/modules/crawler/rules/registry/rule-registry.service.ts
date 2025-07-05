import { Injectable, Logger } from '@nestjs/common';
import { 
  ScoringRule, 
  RuleContext, 
  RuleDimension,
  RuleConstructor 
} from '../interfaces/rule.interface';

@Injectable()
export class RuleRegistryService {
  private readonly logger = new Logger(RuleRegistryService.name);
  private readonly rules = new Map<RuleDimension, ScoringRule[]>();
  private readonly ruleById = new Map<string, ScoringRule>();
  
  constructor() {
    // Initialize dimensions for AEO system
    const dimensions: RuleDimension[] = [
      'technical',
      'content',
      'authority',
      'quality'
    ];
    
    dimensions.forEach(dimension => {
      this.rules.set(dimension, []);
    });
  }
  
  /**
   * Register a rule instance
   */
  register(rule: ScoringRule): void {
    if (this.ruleById.has(rule.id)) {
      this.logger.warn(`Rule ${rule.id} already registered, replacing...`);
    }
    
    // Add to dimension collection
    const dimensionRules = this.rules.get(rule.dimension) || [];
    const existingIndex = dimensionRules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      dimensionRules[existingIndex] = rule;
    } else {
      dimensionRules.push(rule);
    }
    
    // Sort by priority (higher priority first)
    dimensionRules.sort((a, b) => b.priority - a.priority);
    
    this.rules.set(rule.dimension, dimensionRules);
    this.ruleById.set(rule.id, rule);
    
    this.logger.log(`Registered rule ${rule.id} for dimension ${rule.dimension}`);
  }
  
  /**
   * Register a rule constructor with optional config
   */
  registerRule(RuleClass: RuleConstructor, config?: Record<string, any>): void {
    const rule = new RuleClass(config);
    this.register(rule);
  }
  
  /**
   * Get all rules for a dimension that apply to the given context
   * Filters by execution scope - page-level analysis gets only page-scoped rules
   */
  getRulesForDimension(dimension: RuleDimension, context: RuleContext, executionScope: 'page' | 'domain' = 'page'): ScoringRule[] {
    const allRules = this.rules.get(dimension) || [];
    
    // Filter rules by execution scope and context applicability
    const applicableRules = allRules.filter(rule => {
      // Filter by execution scope first
      if (rule.executionScope !== executionScope) {
        this.logger.debug(`Rule ${rule.id} has scope ${rule.executionScope}, expected ${executionScope} for ${context.url}`);
        return false;
      }
      
      // Then check if rule applies to this context
      const applies = rule.appliesTo(context);
      if (!applies) {
        this.logger.debug(`Rule ${rule.id} does not apply to ${context.url}`);
      }
      return applies;
    });
    
    this.logger.log(
      `Found ${applicableRules.length} ${executionScope}-scoped applicable rules for ${dimension} on ${context.url}`
    );
    
    return applicableRules;
  }
  
  /**
   * Get a specific rule by ID
   */
  getRule(ruleId: string): ScoringRule | undefined {
    return this.ruleById.get(ruleId);
  }
  
  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    const rule = this.ruleById.get(ruleId);
    if (!rule) {
      return false;
    }
    
    // Remove from dimension collection
    const dimensionRules = this.rules.get(rule.dimension) || [];
    const filtered = dimensionRules.filter(r => r.id !== ruleId);
    this.rules.set(rule.dimension, filtered);
    
    // Remove from ID map
    this.ruleById.delete(ruleId);
    
    this.logger.log(`Removed rule ${ruleId}`);
    return true;
  }
  
  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.ruleById.get(ruleId);
    if (rule && rule.config) {
      rule.config.enabled = enabled;
      this.logger.log(`Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Update rule configuration
   */
  updateRuleConfig(ruleId: string, config: Record<string, any>): void {
    const rule = this.ruleById.get(ruleId);
    if (rule) {
      rule.config = { ...rule.config, ...config };
      if (config.weight !== undefined) {
        rule.weight = config.weight;
      }
      this.logger.log(`Updated config for rule ${ruleId}`);
    }
  }
  
  /**
   * Get all registered rules
   */
  getAllRules(): Map<RuleDimension, ScoringRule[]> {
    return this.rules;
  }
  
  /**
   * Get all rules with detailed information for the UI
   */
  async getAllRulesWithDetails(): Promise<any> {
    const ruleDetails: any[] = [];
    
    this.rules.forEach((rules, dimension) => {
      rules.forEach(rule => {
        // Check if rule uses LLM by looking for trackedLLMService usage
        const usesLLM = this.checkIfRuleUsesLLM(rule);
        
        ruleDetails.push({
          id: rule.id,
          name: rule.name,
          dimension,
          description: rule.description,
          priority: rule.priority,
          weight: rule.weight,
          applicability: rule.applicability,
          executionScope: rule.executionScope,
          usesLLM,
          llmPurpose: usesLLM ? this.getLLMPurpose(rule) : null,
        });
      });
    });
    
    return ruleDetails;
  }
  
  private checkIfRuleUsesLLM(rule: ScoringRule): boolean {
    // Domain Authority Rule is known to use LLM
    if (rule.id === 'domain-authority') {
      return true;
    }
    // Brand Keyword Alignment Rule now uses LLM
    if (rule.id === 'brand-keyword-alignment') {
      return true;
    }
    // Add other rules that use LLM here
    return false;
  }
  
  private getLLMPurpose(rule: ScoringRule): string {
    switch (rule.id) {
      case 'domain-authority':
        return 'Researches domain reputation and authority using web search';
      case 'brand-keyword-alignment':
        return 'Analyzes how well brand values are authentically reflected in content';
      default:
        return 'Uses AI for advanced analysis';
    }
  }
  
  /**
   * Get registry statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalRules: this.ruleById.size,
      byDimension: {}
    };
    
    this.rules.forEach((rules, dimension) => {
      stats.byDimension[dimension] = {
        count: rules.length,
        rules: rules.map(r => ({
          id: r.id,
          name: r.name,
          weight: r.weight,
          priority: r.priority
        }))
      };
    });
    
    return stats;
  }
}