import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category, EvidenceItem, RuleIssue } from '../../../interfaces/rule.interface';
import { PageCategoryType } from '../../../interfaces/page-category.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { StructuredDataIssueId, createStructuredDataIssue } from './structured-data.issues';


// Evidence topics for this rule
enum StructuredDataTopic {
  SCHEMA_ANALYSIS = 'Schema Analysis',
  NO_STRUCTURED_DATA = 'No Structured Data',
  SCHEMA = 'Schema',
  STRUCTURE = 'Structure'
}

interface StructuredDataItem {
  type: string;
  format: 'json-ld' | 'microdata' | 'rdfa';
  isValid: boolean;
  properties: string[];
  raw?: any; // Store raw data for detailed analysis
  validationErrors?: string[];
  name?: string; // Store item name if available
}

@Injectable()
export class StructuredDataRule extends BaseAEORule {
  constructor() {
    super(
      'structured_data',
      'Structured Data Implementation',
      'TECHNICAL' as Category,
      {
        impactScore: 3, // High impact
        pageTypes: [
          PageCategoryType.HOMEPAGE, 
          PageCategoryType.PRODUCT_CATEGORY_PAGE, 
          PageCategoryType.PRODUCT_DETAIL_PAGE, 
          PageCategoryType.SERVICES_FEATURES_PAGE,
          PageCategoryType.PRICING_PAGE, 
          PageCategoryType.COMPARISON_PAGE, 
          PageCategoryType.BLOG_POST_ARTICLE, 
          PageCategoryType.BLOG_CATEGORY_TAG_PAGE, 
          PageCategoryType.PILLAR_PAGE_TOPIC_HUB,
          PageCategoryType.PRODUCT_ROUNDUP_REVIEW_ARTICLE, 
          PageCategoryType.HOW_TO_GUIDE_TUTORIAL, 
          PageCategoryType.CASE_STUDY_SUCCESS_STORY, 
          PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE,
          PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER, 
          PageCategoryType.FAQ_GLOSSARY_PAGES, 
          PageCategoryType.PUBLIC_FORUM_UGC_PAGES, 
          PageCategoryType.CORPORATE_CONTACT_PAGES,
          PageCategoryType.LEGAL_PAGES
        ],
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 20; // Base score
    const scoreBreakdown: { component: string; points: number }[] = [
      { component: 'Base score', points: 20 }
    ];

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(20));

    // Initialize variables at the top level
    let jsonLdData: StructuredDataItem[] = [];
    let microdataItems: StructuredDataItem[] = [];
    let rdfaItems: StructuredDataItem[] = [];
    let totalStructuredData = 0;

    try {
      // Extract structured data
      jsonLdData = this.extractJsonLd(content.html || '');
      microdataItems = this.extractMicrodata(content.html || '');
      rdfaItems = this.extractRdfa(content.html || '');

      totalStructuredData = jsonLdData.length + microdataItems.length + rdfaItems.length;
      
      evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, `Found ${totalStructuredData} structured data item(s)`));
      
      if (totalStructuredData === 0) {
        score = 20;
        evidence.push(EvidenceHelper.error(StructuredDataTopic.NO_STRUCTURED_DATA, 'No structured data found', { score: 20, maxScore: 100 }));
        recommendations.push('Add schema.org markup to help AI understand your content');
      } else {
        // Analyze JSON-LD (preferred format)
        if (jsonLdData.length > 0) {
          evidence.push(EvidenceHelper.success(StructuredDataTopic.SCHEMA_ANALYSIS, `JSON-LD format detected (${jsonLdData.length} item(s)) - Preferred format`, { score: 40, maxScore: 40 }));
          
          // Show detected schema types
          const schemaTypes = jsonLdData.map(item => item.type).filter(type => type !== 'Unknown');
          const unknownCount = jsonLdData.filter(item => item.type === 'Unknown').length;
          
          if (schemaTypes.length > 0) {
            evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, `  Schemas found: ${schemaTypes.join(', ')}`));
          }
          if (unknownCount > 0) {
            evidence.push(EvidenceHelper.warning(StructuredDataTopic.NO_STRUCTURED_DATA, `${unknownCount} schema(s) missing @type property`));
          }
          
          score = 60; // Base score for having JSON-LD
          scoreBreakdown.push({ component: 'JSON-LD format detected', points: 40 });
          
          jsonLdData.forEach(item => {
            const schemaStatus = item.isValid ? ' ✓' : ' ⚠ Invalid';
            evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, `  • ${item.type} schema${schemaStatus}`));
            
            // Add validation error details
            if (!item.isValid && item.validationErrors && item.validationErrors.length > 0) {
              item.validationErrors.forEach(error => {
                evidence.push(EvidenceHelper.warning(StructuredDataTopic.SCHEMA_ANALYSIS, `Validation error: ${error}`));
              });
            }
            
            if (item.properties.length > 0) {
              evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, `    Properties: ${item.properties.slice(0, 5).join(', ')}${item.properties.length > 5 ? '...' : ''}`));
            }
            
            // Add source code snippet for better debugging
            if (item.raw) {
              try {
                const snippet = JSON.stringify(item.raw, null, 2);
                const lines = snippet.split('\n');
                const maxLines = 8;
                const truncated = lines.length > maxLines;
                const displayLines = lines.slice(0, maxLines);
                
                // Only show snippet for Unknown types or invalid schemas
                if (item.type === 'Unknown' || !item.isValid) {
                  let codeContent = displayLines.join('\n      ');
                  if (truncated) {
                    codeContent += '\n      ... (truncated)';
                  }
                  evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, '    Source:', { code: `    ${codeContent}` }));
                }
              } catch (e) {
                // Ignore stringify errors
              }
            }
          });
        }

        // Check for recommended schema types based on page type
        const recommendedSchemas = this.getRecommendedSchemas(content.pageType);
        const implementedTypes = [...jsonLdData, ...microdataItems, ...rdfaItems].map(item => item.type);
        
        const hasRecommendedSchemas = recommendedSchemas.some(schema => 
          implementedTypes.some(type => type.includes(schema))
        );

        if (hasRecommendedSchemas) {
          const bonus = Math.min(20, 100 - score);
          score = Math.min(100, score + bonus);
          scoreBreakdown.push({ component: 'Recommended schema types', points: bonus });
          evidence.push(EvidenceHelper.success(StructuredDataTopic.SCHEMA, 'Implements recommended schema types for this page type', { score: bonus, maxScore: 20 }));
        } else if (recommendedSchemas.length > 0) {
          evidence.push(EvidenceHelper.warning(StructuredDataTopic.SCHEMA, 'Missing recommended schemas', {
            code: `Recommended for this page type: ${recommendedSchemas.join(', ')}`,
            target: 'Add schema.org structured data to help AI understand your content',
            score: 0,
            maxScore: 20
          }));
          recommendations.push(`Consider adding: ${recommendedSchemas.join(', ')} schemas`);
        }

        // Check for essential properties
        const missingProperties = this.getMissingEssentialProperties(jsonLdData);
        const foundProperties = this.getFoundEssentialProperties(jsonLdData);
        
        if (missingProperties.length === 0 && jsonLdData.length > 0) {
          const bonus = Math.min(20, 100 - score);
          score = Math.min(100, score + bonus);
          scoreBreakdown.push({ component: 'Essential properties present', points: bonus });
          
          // Show what essential properties were found
          const foundSummary = foundProperties.map(found => 
            `${found.schema}: ${found.properties.join(', ')}`
          ).join('\n');
          
          evidence.push(EvidenceHelper.success(StructuredDataTopic.SCHEMA, 'Essential schema properties are present', { 
            score: bonus, 
            maxScore: 20,
            code: foundSummary,
            target: 'All required properties found for schema validation'
          }));
        } else if (missingProperties.length > 0) {
          // Show both found and missing properties
          let propertiesStatus = '';
          
          if (foundProperties.length > 0) {
            propertiesStatus += 'Found properties:\n';
            propertiesStatus += foundProperties.map(found => 
              `${found.schema}: ${found.properties.join(', ')}`
            ).join('\n');
            propertiesStatus += '\n\n';
          }
          
          propertiesStatus += 'Missing properties:\n';
          propertiesStatus += missingProperties.map(missing => 
            `${missing.schema}: ${missing.properties.join(', ')}`
          ).join('\n');
          
          evidence.push(EvidenceHelper.warning(StructuredDataTopic.SCHEMA, 'Missing some essential schema properties', {
            code: propertiesStatus,
            target: 'Add missing properties to improve schema validation'
          }));
          
          missingProperties.forEach(missing => {
            recommendations.push(`Add to ${missing.schema}: ${missing.properties.join(', ')}`);
          });
        }

        // Rich implementation info (no points awarded, just informational)
        if (totalStructuredData >= 3) {
          evidence.push(EvidenceHelper.success(StructuredDataTopic.STRUCTURE, 'Rich structured data implementation (3+ schemas)', { target: 'Multiple schemas provide comprehensive data' }));
        } else if (totalStructuredData < 3) {
          evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, 'Opportunity for richer implementation', { 
            score: 0,
            maxScore: 0,
            target: `Implement ${3 - totalStructuredData} more schema(s) for richer implementation`
          }));
          recommendations.push(`Implement ${3 - totalStructuredData} more schema(s) to reach 3+ for rich implementation`);
        }

        // Schema nesting info (no points awarded, just informational)
        const nestedRelationships = this.getNestedSchemaRelationships(content.html || '');
        if (nestedRelationships.length > 0) {
          evidence.push(EvidenceHelper.success(StructuredDataTopic.SCHEMA, 'Advanced: Uses nested schema relationships', { target: 'Nested relationships provide rich context' }));
          nestedRelationships.forEach(rel => {
            evidence.push(EvidenceHelper.info(StructuredDataTopic.SCHEMA_ANALYSIS, `${rel}`));
          });
        }
      }

      // Microdata check (less preferred)
      if (microdataItems.length > 0 && jsonLdData.length === 0) {
        evidence.push(EvidenceHelper.warning(StructuredDataTopic.SCHEMA_ANALYSIS, `Microdata format detected (${microdataItems.length} item(s)) - Consider migrating to JSON-LD`));
      }

      // RDFa check (least preferred)
      if (rdfaItems.length > 0 && jsonLdData.length === 0) {
        evidence.push(EvidenceHelper.warning(StructuredDataTopic.SCHEMA_ANALYSIS, `RDFa format detected (${rdfaItems.length} item(s)) - Consider migrating to JSON-LD`));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error(StructuredDataTopic.SCHEMA_ANALYSIS, `Error evaluating structured data: ${error.message}`));
      score = 20;
    }

    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Generate issues based on problems found
    const issues: RuleIssue[] = [];
    
    const allStructuredDataItems = [...jsonLdData, ...microdataItems, ...rdfaItems];
    
    if (totalStructuredData === 0) {
      issues.push(createStructuredDataIssue(StructuredDataIssueId.NO_STRUCTURED_DATA));
    } else {
      // Check for validation errors
      const itemsWithErrors = allStructuredDataItems.filter(item => item.validationErrors && item.validationErrors.length > 0);
      if (itemsWithErrors.length > 0) {
        const affectedTypes = itemsWithErrors.map(item => item.type);
        issues.push(createStructuredDataIssue(
          StructuredDataIssueId.VALIDATION_ERRORS,
          affectedTypes,
          `Structured data validation errors found in ${itemsWithErrors.length} item(s)`
        ));
      }
      
      // Check for missing recommended types based on page category
      if (content.pageCategory?.type) {
        const pageType = content.pageCategory.type;
        const hasRecommendedType = this.hasRecommendedSchemaForPageType(allStructuredDataItems, pageType);
        
        if (!hasRecommendedType) {
          const recommendedTypes = this.getRecommendedTypes(pageType);
          if (recommendedTypes.length > 0) {
            issues.push(createStructuredDataIssue(
              StructuredDataIssueId.MISSING_RECOMMENDED_TYPE,
              recommendedTypes,
              `Missing recommended structured data for ${pageType} page`
            ));
          }
        }
      }
      
      // Check for incomplete schemas
      const incompleteSchemas = allStructuredDataItems.filter(item => 
        item.properties.length < 3 && item.type !== 'BreadcrumbList'
      );
      
      if (incompleteSchemas.length > 0) {
        const affectedTypes = incompleteSchemas.map(item => item.type);
        issues.push(createStructuredDataIssue(
          StructuredDataIssueId.INCOMPLETE_SCHEMAS,
          affectedTypes,
          `${incompleteSchemas.length} schema(s) have minimal properties`
        ));
      }
      
      // Check for missing JSON-LD format
      if (jsonLdData.length === 0) {
        issues.push(createStructuredDataIssue(StructuredDataIssueId.NO_JSON_LD));
      }
    }
    
    return this.createResult(score, evidence, issues, { scoreBreakdown }, recommendations);
  }

  private extractJsonLd(html: string): StructuredDataItem[] {
    const items: StructuredDataItem[] = [];
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);
        
        if (Array.isArray(data)) {
          data.forEach(item => items.push(this.parseJsonLdItem(item)));
        } else if (data['@graph'] && Array.isArray(data['@graph'])) {
          // Handle JSON-LD @graph format
          data['@graph'].forEach(item => items.push(this.parseJsonLdItem(item)));
        } else {
          items.push(this.parseJsonLdItem(data));
        }
      } catch (error) {
        items.push({
          type: 'Invalid JSON-LD',
          format: 'json-ld',
          isValid: false,
          properties: [],
          validationErrors: [`JSON parse error: ${error.message}`],
          name: 'Parse Error'
        });
      }
    }
    
    return items;
  }

  private parseJsonLdItem(data: any): StructuredDataItem {
    const type = data['@type'] || 'Unknown';
    const properties = Object.keys(data).filter(key => !key.startsWith('@') && key !== 'type');
    const validationErrors: string[] = [];
    
    // Validate required fields
    if (!data['@context']) {
      validationErrors.push('Missing @context property');
    }
    if (!data['@type']) {
      validationErrors.push('Missing @type property');
    }
    
    // Extract name if available
    const name = data.name || data.headline || data.title || undefined;
    
    return {
      type: Array.isArray(type) ? type.join(', ') : type,
      format: 'json-ld',
      isValid: validationErrors.length === 0,
      properties,
      validationErrors,
      name,
      raw: data
    };
  }

  private extractMicrodata(html: string): StructuredDataItem[] {
    const items: StructuredDataItem[] = [];
    const itemscopeRegex = /<[^>]+itemscope[^>]+itemtype=["']([^"']+)["'][^>]*>/gi;
    
    let match;
    while ((match = itemscopeRegex.exec(html)) !== null) {
      const typeUrl = match[1];
      const type = typeUrl.split('/').pop() || 'Unknown';
      
      items.push({
        type,
        format: 'microdata',
        isValid: true,
        properties: [] // Would need more complex parsing for properties
      });
    }
    
    return items;
  }

  private extractRdfa(html: string): StructuredDataItem[] {
    const items: StructuredDataItem[] = [];
    const typeofRegex = /<[^>]+typeof=["']([^"']+)["'][^>]*>/gi;
    
    let match;
    while ((match = typeofRegex.exec(html)) !== null) {
      items.push({
        type: match[1],
        format: 'rdfa',
        isValid: true,
        properties: []
      });
    }
    
    return items;
  }

  private getRecommendedSchemas(pageType?: string): string[] {
    const recommendations: { [key: string]: string[] } = {
      [PageCategoryType.HOMEPAGE]: ['Organization', 'WebSite', 'SearchAction'],
      [PageCategoryType.PRODUCT_DETAIL_PAGE]: ['Product', 'Offer', 'AggregateRating', 'Review'],
      [PageCategoryType.PRODUCT_CATEGORY_PAGE]: ['ItemList', 'Product', 'BreadcrumbList'],
      [PageCategoryType.BLOG_POST_ARTICLE]: ['Article', 'BlogPosting', 'Person', 'BreadcrumbList'],
      [PageCategoryType.SERVICES_FEATURES_PAGE]: ['Service', 'Organization', 'LocalBusiness'],
      [PageCategoryType.FAQ_GLOSSARY_PAGES]: ['FAQPage', 'Question', 'Answer', 'DefinedTerm'],
      [PageCategoryType.HOW_TO_GUIDE_TUTORIAL]: ['HowTo', 'HowToStep', 'HowToSupply', 'HowToTool'],
      [PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE]: ['DefinedTerm', 'Article'],
      [PageCategoryType.CASE_STUDY_SUCCESS_STORY]: ['Article', 'Organization', 'Person'],
      [PageCategoryType.CORPORATE_CONTACT_PAGES]: ['Organization', 'ContactPoint', 'PostalAddress'],
      [PageCategoryType.PRICING_PAGE]: ['Product', 'Offer', 'Service'],
      [PageCategoryType.COMPARISON_PAGE]: ['ItemList', 'Product', 'ComparisonTable']
    };
    
    return recommendations[pageType || ''] || ['Organization', 'WebPage'];
  }

  private hasRecommendedSchemaForPageType(items: StructuredDataItem[], pageType: string): boolean {
    const recommendedTypes = this.getRecommendedTypes(pageType);
    const foundTypes = items.map(item => item.type.split(',')[0].trim());
    
    return recommendedTypes.some(recommended => 
      foundTypes.some(found => found.toLowerCase() === recommended.toLowerCase())
    );
  }
  
  private getRecommendedTypes(pageType: string): string[] {
    const typeMap: { [key: string]: string[] } = {
      [PageCategoryType.HOMEPAGE]: ['Organization', 'WebSite'],
      [PageCategoryType.PRODUCT_DETAIL_PAGE]: ['Product'],
      [PageCategoryType.PRODUCT_CATEGORY_PAGE]: ['ItemList'],
      [PageCategoryType.BLOG_POST_ARTICLE]: ['Article', 'BlogPosting'],
      [PageCategoryType.SERVICES_FEATURES_PAGE]: ['Service'],
      [PageCategoryType.FAQ_GLOSSARY_PAGES]: ['FAQPage'],
      [PageCategoryType.HOW_TO_GUIDE_TUTORIAL]: ['HowTo'],
      [PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE]: ['DefinedTerm', 'Article'],
      [PageCategoryType.CASE_STUDY_SUCCESS_STORY]: ['Article'],
      [PageCategoryType.CORPORATE_CONTACT_PAGES]: ['Organization', 'ContactPoint'],
      [PageCategoryType.PRICING_PAGE]: ['Product', 'Offer'],
      [PageCategoryType.COMPARISON_PAGE]: ['ItemList']
    };
    
    return typeMap[pageType] || [];
  }

  private getMissingEssentialProperties(jsonLdData: StructuredDataItem[]): Array<{schema: string, properties: string[]}> {
    // Check if essential properties are present for common schemas
    const essentialProps: { [key: string]: string[] } = {
      Article: ['headline', 'author', 'datePublished'],
      Product: ['name', 'description', 'image'],
      Organization: ['name', 'url'],
      Person: ['name'],
      Review: ['reviewRating', 'author'],
      HowTo: ['name', 'step'],
      FAQPage: ['mainEntity'],
      Service: ['name', 'provider'],
      LocalBusiness: ['name', 'address'],
      BreadcrumbList: ['itemListElement']
    };
    
    const missingProps: Array<{schema: string, properties: string[]}> = [];
    
    jsonLdData.forEach(item => {
      const schemaType = item.type.split(',')[0].trim();
      const required = essentialProps[schemaType];
      
      if (required) {
        const missing = required.filter(prop => !item.properties.includes(prop));
        if (missing.length > 0) {
          missingProps.push({ schema: schemaType, properties: missing });
        }
      }
    });
    
    return missingProps;
  }

  private getFoundEssentialProperties(jsonLdData: StructuredDataItem[]): Array<{schema: string, properties: string[]}> {
    // Check which essential properties are present for common schemas
    const essentialProps: { [key: string]: string[] } = {
      Article: ['headline', 'author', 'datePublished'],
      Product: ['name', 'description', 'image'],
      Organization: ['name', 'url'],
      Person: ['name'],
      Review: ['reviewRating', 'author'],
      HowTo: ['name', 'step'],
      FAQPage: ['mainEntity'],
      Service: ['name', 'provider'],
      LocalBusiness: ['name', 'address'],
      BreadcrumbList: ['itemListElement']
    };
    
    const foundProps: Array<{schema: string, properties: string[]}> = [];
    
    jsonLdData.forEach(item => {
      const schemaType = item.type.split(',')[0].trim();
      const required = essentialProps[schemaType];
      
      if (required) {
        const found = required.filter(prop => item.properties.includes(prop));
        if (found.length > 0) {
          foundProps.push({ schema: schemaType, properties: found });
        }
      }
    });
    
    return foundProps;
  }

  private getNestedSchemaRelationships(html: string): string[] {
    const relationships: string[] = [];
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);
        
        // Check for nested relationships
        const checkNested = (obj: any, parentType: string = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          // Check specific nested properties
          if (obj.author && typeof obj.author === 'object') {
            const authorType = obj.author['@type'] || 'Unknown';
            relationships.push(`${parentType || 'Article'} has author (${authorType})`);
          }
          
          if (obj.publisher && typeof obj.publisher === 'object') {
            const publisherType = obj.publisher['@type'] || 'Unknown';
            relationships.push(`${parentType || 'Article'} has publisher (${publisherType})`);
          }
          
          if (obj.aggregateRating && typeof obj.aggregateRating === 'object') {
            relationships.push(`${parentType || 'Product'} has aggregateRating`);
          }
          
          if (obj.review && Array.isArray(obj.review)) {
            relationships.push(`${parentType || 'Product'} has ${obj.review.length} review(s)`);
          }
          
          if (obj.offers && (Array.isArray(obj.offers) || typeof obj.offers === 'object')) {
            const offerCount = Array.isArray(obj.offers) ? obj.offers.length : 1;
            relationships.push(`${parentType || 'Product'} has ${offerCount} offer(s)`);
          }
          
          if (obj.itemListElement && Array.isArray(obj.itemListElement)) {
            relationships.push(`${parentType || 'BreadcrumbList'} has ${obj.itemListElement.length} items`);
          }
          
          if (obj.mainEntity && (Array.isArray(obj.mainEntity) || typeof obj.mainEntity === 'object')) {
            const entityCount = Array.isArray(obj.mainEntity) ? obj.mainEntity.length : 1;
            relationships.push(`${parentType || 'FAQPage'} has ${entityCount} question(s)`);
          }
        };
        
        if (Array.isArray(data)) {
          data.forEach(item => checkNested(item, item['@type']));
        } else {
          checkNested(data, data['@type']);
        }
        
      } catch {
        // Ignore parse errors
      }
    }
    
    return [...new Set(relationships)]; // Remove duplicates
  }
}