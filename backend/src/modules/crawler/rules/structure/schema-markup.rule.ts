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
  weight = 0.25;

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals, pageCategory } = context;
    const schemaTypes = pageSignals.structure.schemaTypes || [];
    const hasSchema = pageSignals.structure.hasSchema;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    if (!hasSchema || schemaTypes.length === 0) {
      score = 0; // No schema = complete failure
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
        
        // Add explanation about why this schema is good
        const explanation = this.getSchemaExplanation(schemaTypes, pageCategory.type, true);
        if (explanation) {
          evidence.push(explanation);
        }
      } else {
        score = 60;
        
        // Provide detailed explanation about why the schema may not be optimal
        const explanation = this.getSchemaExplanation(schemaTypes, pageCategory.type, false);
        evidence.push(`Schema found but may not be optimal: ${schemaTypes.join(', ')}`);
        if (explanation) {
          evidence.push(explanation);
        }
        
        // Provide specific recommendations
        const recommendation = this.getSchemaRecommendation(pageCategory.type, schemaTypes);
        issues.push(this.generateIssue(
          'medium',
          `Consider using more specific schema types for ${pageCategory.type}`,
          recommendation
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

  private getSchemaExplanation(schemaTypes: string[], pageCategory: string, isOptimal: boolean): string | null {
    // Provide explanations for common schema types
    const schemaExplanations: Record<string, { optimal: string; suboptimal: string }> = {
      'FAQPage': {
        optimal: 'FAQPage schema helps search engines display Q&A content in rich snippets',
        suboptimal: 'FAQPage is generic and may not leverage category-specific features'
      },
      'WebPage': {
        optimal: 'WebPage provides basic structured data for page understanding',
        suboptimal: 'WebPage is too generic - more specific schemas would provide richer context'
      },
      'Article': {
        optimal: 'Article schema enables rich snippets with headline, author, and publish date',
        suboptimal: 'Article schema may lack product/service specific signals'
      },
      'Product': {
        optimal: 'Product schema enables price, availability, and review rich snippets',
        suboptimal: 'Product schema may not be suitable for informational content'
      },
      'Organization': {
        optimal: 'Organization schema helps establish brand identity and knowledge graph',
        suboptimal: 'Organization schema alone misses page-specific context'
      }
    };

    // Category-specific explanations
    const categoryExplanations: Record<string, string> = {
      [PAGE_CATEGORIES.PRODUCT_SERVICE]: isOptimal 
        ? 'Product/Service schemas enable rich snippets with pricing, reviews, and availability'
        : 'Product pages benefit from specific product schemas for better visibility',
      [PAGE_CATEGORIES.BLOG_ARTICLE]: isOptimal
        ? 'Article schema provides author, date, and headline for news carousels'
        : 'Blog posts need Article/BlogPosting schema for content discovery',
      [PAGE_CATEGORIES.FAQ]: isOptimal
        ? 'FAQPage schema can trigger FAQ rich results in search'
        : 'While FAQPage exists, ensure proper Question/Answer nesting for best results',
      [PAGE_CATEGORIES.HOMEPAGE]: isOptimal
        ? 'WebSite/Organization schemas establish site identity and sitelinks'
        : 'Homepage needs WebSite schema for sitelinks search box and brand presence'
    };

    // Check for specific schema explanations
    for (const schemaType of schemaTypes) {
      const baseType = schemaType.replace(/https?:\/\/schema\.org\//, '');
      if (schemaExplanations[baseType]) {
        return isOptimal 
          ? schemaExplanations[baseType].optimal 
          : schemaExplanations[baseType].suboptimal;
      }
    }

    // Return category-specific explanation if available
    return categoryExplanations[pageCategory] || null;
  }

  private getSchemaRecommendation(pageCategory: string, currentSchemas: string[]): string {
    const recommendedSchemas = this.getRecommendedSchemas(pageCategory);
    const missingSchemas = recommendedSchemas.filter(rec => 
      !currentSchemas.some(current => current.toLowerCase().includes(rec.toLowerCase()))
    );

    const recommendations: Record<string, string> = {
      [PAGE_CATEGORIES.PRODUCT_SERVICE]: 'Add Product schema with price, availability, and aggregate ratings for rich snippets',
      [PAGE_CATEGORIES.BLOG_ARTICLE]: 'Use Article or BlogPosting schema with author, datePublished, and headline properties',
      [PAGE_CATEGORIES.FAQ]: 'Ensure proper FAQPage structure with nested Question and Answer schemas',
      [PAGE_CATEGORIES.HOMEPAGE]: 'Implement WebSite schema with searchAction for sitelinks search box',
      [PAGE_CATEGORIES.DOCUMENTATION_HELP]: 'Consider HowTo or TechArticle schema for step-by-step guides',
      [PAGE_CATEGORIES.ABOUT_COMPANY]: 'Add Organization schema with full company details and social profiles',
      [PAGE_CATEGORIES.PRICING]: 'Use Offer schema to structure pricing tiers and features',
      [PAGE_CATEGORIES.CASE_STUDY]: 'Implement Review or Article schema with client testimonials'
    };

    const baseRecommendation = recommendations[pageCategory] || 
      `Recommended schemas for ${pageCategory}: ${recommendedSchemas.join(', ')}`;

    if (missingSchemas.length > 0) {
      return `${baseRecommendation}. Missing: ${missingSchemas.join(', ')}`;
    }

    return baseRecommendation;
  }
}