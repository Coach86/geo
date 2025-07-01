import { Injectable } from '@nestjs/common';
import { BaseStructureRule } from './base-structure.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PAGE_CATEGORIES } from '../constants/page-categories';

@Injectable()
export class SchemaMarkupRule extends BaseStructureRule {
  id = 'structure-schema-markup';
  name = 'Schema Markup';
  description = 'Evaluates structured data implementation';
  applicability = { scope: 'all' as const };
  priority = 9;
  weight = 0.3;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals, pageCategory } = context;
    const schemaTypes = pageSignals.structure.schemaTypes || [];
    const hasSchema = pageSignals.structure.hasSchema;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    if (!hasSchema || schemaTypes.length === 0) {
      score = 20; // Base score for no schema
      issues.push(this.generateIssue(
        'high',
        'No structured data (schema.org) found',
        'Add appropriate schema markup for better search engine understanding'
      ));
      evidence.push('No schema markup detected');
    } else {
      // Check for appropriate schema types based on page category
      const recommendedSchemas = this.getRecommendedSchemas(pageCategory.type);
      const hasRecommendedSchema = recommendedSchemas.some(rec => 
        schemaTypes.some(type => type.toLowerCase().includes(rec.toLowerCase()))
      );

      if (hasRecommendedSchema) {
        score = 100;
        evidence.push(`Appropriate schema found: ${schemaTypes.join(', ')}`);
      } else {
        score = 60;
        evidence.push(`Schema found but may not be optimal: ${schemaTypes.join(', ')}`);
        issues.push(this.generateIssue(
          'medium',
          `Consider using more specific schema types for ${pageCategory.type}`,
          `Recommended schemas: ${recommendedSchemas.join(', ')}`
        ));
      }

      // Bonus for multiple relevant schemas
      if (schemaTypes.length > 1) {
        evidence.push(`Multiple schema types implemented (${schemaTypes.length})`);
      }
    }

    return this.createResult(
      score,
      100,
      evidence,
      { schemaTypes, hasSchema, recommendedSchemas: this.getRecommendedSchemas(pageCategory.type) },
      issues
    );
  }

  private getRecommendedSchemas(category: string): string[] {
    const schemaMap: Record<string, string[]> = {
      [PAGE_CATEGORIES.HOMEPAGE]: ['WebSite', 'Organization'],
      [PAGE_CATEGORIES.BLOG_ARTICLE]: ['Article', 'BlogPosting', 'NewsArticle'],
      [PAGE_CATEGORIES.PRODUCT_SERVICE]: ['Product', 'Offer', 'AggregateRating', 'Service'],
      [PAGE_CATEGORIES.NAVIGATION_CATEGORY]: ['CollectionPage', 'ItemList'],
      [PAGE_CATEGORIES.FAQ]: ['FAQPage', 'Question', 'Answer'],
      [PAGE_CATEGORIES.CONTACT]: ['ContactPage', 'Organization'],
      [PAGE_CATEGORIES.DOCUMENTATION_HELP]: ['TechArticle', 'Article', 'HowTo'],
      [PAGE_CATEGORIES.ABOUT_COMPANY]: ['AboutPage', 'Organization'],
      [PAGE_CATEGORIES.CASE_STUDY]: ['Article', 'Review'],
      [PAGE_CATEGORIES.PRICING]: ['Offer', 'Product'],
      [PAGE_CATEGORIES.LANDING_CAMPAIGN]: ['WebPage', 'Service'],
      [PAGE_CATEGORIES.LEGAL_POLICY]: ['WebPage'],
      [PAGE_CATEGORIES.ERROR_404]: ['WebPage'],
      [PAGE_CATEGORIES.LOGIN_ACCOUNT]: ['WebPage'],
      [PAGE_CATEGORIES.SEARCH_RESULTS]: ['SearchResultsPage'],
      [PAGE_CATEGORIES.UNKNOWN]: ['WebPage']
    };

    return schemaMap[category] || ['WebPage'];
  }
}