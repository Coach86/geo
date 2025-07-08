const { BaseRule, EvidenceHelper } = require('../base-rule');
const { PageCategoryType } = require('../../page-category-types');

class StructuredDataRule extends BaseRule {
  constructor() {
    super(
      'structured_data',
      'Structured Data Implementation',
      'technical',
      {
        impactScore: 3, // High impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 20; // Base score
    const scoreBreakdown = [
      { component: 'Base score', points: 20 }
    ];

    // Add base score evidence item
    evidence.push(EvidenceHelper.base(20));

    // Initialize variables at the top level
    let jsonLdData = [];
    let microdataItems = [];
    let rdfaItems = [];
    let totalStructuredData = 0;

    try {
      // Extract structured data
      const html = content.html || '';
      jsonLdData = this.extractJsonLd(html);
      microdataItems = this.extractMicrodata(html);
      rdfaItems = this.extractRdfa(html);

      totalStructuredData = jsonLdData.length + microdataItems.length + rdfaItems.length;
      
      evidence.push(EvidenceHelper.info('Schema Analysis', `Found ${totalStructuredData} structured data item(s)`));
      
      if (totalStructuredData === 0) {
        score = 20;
        evidence.push(EvidenceHelper.error('No Structured Data', 'No structured data found', { score: 20, maxScore: 100 }));
        recommendations.push('Add schema.org markup to help AI understand your content');
      } else {
        // Analyze JSON-LD (preferred format)
        if (jsonLdData.length > 0) {
          evidence.push(EvidenceHelper.success('Schema Analysis', `JSON-LD format detected (${jsonLdData.length} item(s)) - Preferred format`, { score: 40, maxScore: 40 }));
          
          // Show detected schema types
          const schemaTypes = jsonLdData.map(item => item.type).filter(type => type !== 'Unknown');
          const unknownCount = jsonLdData.filter(item => item.type === 'Unknown').length;
          
          if (schemaTypes.length > 0) {
            evidence.push(EvidenceHelper.info('Schema Analysis', `  Schemas found: ${schemaTypes.join(', ')}`));
          }
          if (unknownCount > 0) {
            evidence.push(EvidenceHelper.warning('No Structured Data', `${unknownCount} schema(s) missing @type property`));
          }
          
          score = 60; // Base score for having JSON-LD
          scoreBreakdown.push({ component: 'JSON-LD format detected', points: 40 });
          
          jsonLdData.forEach(item => {
            const schemaStatus = item.isValid ? ' ✓' : ' ⚠ Invalid';
            evidence.push(EvidenceHelper.info('Schema Analysis', `  • ${item.type} schema${schemaStatus}`));
            
            // Add validation error details
            if (!item.isValid && item.validationErrors && item.validationErrors.length > 0) {
              item.validationErrors.forEach(error => {
                evidence.push(EvidenceHelper.warning('Schema Analysis', `Validation error: ${error}`));
              });
            }
            
            if (item.properties.length > 0) {
              evidence.push(EvidenceHelper.info('Schema Analysis', `    Properties: ${item.properties.slice(0, 5).join(', ')}${item.properties.length > 5 ? '...' : ''}`));
            }
          });
        }

        // Check for recommended schema types based on page type
        const pageType = content.pageCategory?.type || content.pageType;
        const recommendedSchemas = this.getRecommendedSchemas(pageType);
        const implementedTypes = [...jsonLdData, ...microdataItems, ...rdfaItems].map(item => item.type);
        
        const hasRecommendedSchemas = recommendedSchemas.some(schema => 
          implementedTypes.some(type => type.includes(schema))
        );

        if (hasRecommendedSchemas) {
          const bonus = Math.min(20, 100 - score);
          score = Math.min(100, score + bonus);
          scoreBreakdown.push({ component: 'Recommended schema types', points: bonus });
          evidence.push(EvidenceHelper.success('Schema', 'Implements recommended schema types for this page type', { score: bonus, maxScore: 20 }));
        } else if (recommendedSchemas.length > 0) {
          evidence.push(EvidenceHelper.warning('Schema', 'Missing recommended schemas', {
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
          
          evidence.push(EvidenceHelper.success('Schema', 'Essential schema properties are present', { 
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
          
          evidence.push(EvidenceHelper.warning('Schema', 'Missing some essential schema properties', {
            code: propertiesStatus,
            target: 'Add missing properties to improve schema validation'
          }));
          
          missingProperties.forEach(missing => {
            recommendations.push(`Add to ${missing.schema}: ${missing.properties.join(', ')}`);
          });
        }

        // Rich implementation info (no points awarded, just informational)
        if (totalStructuredData >= 3) {
          evidence.push(EvidenceHelper.success('Structure', 'Rich structured data implementation (3+ schemas)', { target: 'Multiple schemas provide comprehensive data' }));
        } else if (totalStructuredData < 3) {
          evidence.push(EvidenceHelper.info('Schema Analysis', 'Opportunity for richer implementation', { 
            score: 0,
            maxScore: 0,
            target: `Implement ${3 - totalStructuredData} more schema(s) for richer implementation`
          }));
          recommendations.push(`Implement ${3 - totalStructuredData} more schema(s) to reach 3+ for rich implementation`);
        }
      }

      // Microdata check (less preferred)
      if (microdataItems.length > 0 && jsonLdData.length === 0) {
        evidence.push(EvidenceHelper.warning('Schema Analysis', `Microdata format detected (${microdataItems.length} item(s)) - Consider migrating to JSON-LD`));
      }

      // Check for Open Graph tags (social sharing)
      const $ = content.$;
      const ogTags = $('meta[property^="og:"]');
      if (ogTags.length >= 4) {
        evidence.push(EvidenceHelper.success('Social', 'Open Graph tags present'));
      } else if (ogTags.length > 0) {
        evidence.push(EvidenceHelper.info('Social', `${ogTags.length} Open Graph tags (minimum 4 recommended)`));
        recommendations.push('Add complete Open Graph tags (title, description, image, url)');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Schema Analysis', `Error evaluating structured data: ${error.message}`));
      score = 20;
    }

    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Generate issues based on problems found
    const allStructuredDataItems = [...jsonLdData, ...microdataItems, ...rdfaItems];
    
    if (totalStructuredData === 0) {
      issues.push(this.createIssue(
        'high',
        'No structured data found',
        'Add schema.org markup to help search engines and AI understand your content'
      ));
    } else {
      // Check for validation errors
      const itemsWithErrors = allStructuredDataItems.filter(item => item.validationErrors && item.validationErrors.length > 0);
      if (itemsWithErrors.length > 0) {
        const affectedTypes = itemsWithErrors.map(item => item.type);
        issues.push(this.createIssue(
          'medium',
          `Structured data validation errors found in ${itemsWithErrors.length} item(s)`,
          'Fix validation errors to ensure proper schema.org compliance',
          affectedTypes
        ));
      }
      
      // Check for missing recommended types based on page category
      const pageType = content.pageCategory?.type || content.pageType;
      if (pageType) {
        const hasRecommendedType = this.hasRecommendedSchemaForPageType(allStructuredDataItems, pageType);
        
        if (!hasRecommendedType) {
          const recommendedTypes = this.getRecommendedTypes(pageType);
          if (recommendedTypes.length > 0) {
            issues.push(this.createIssue(
              'medium',
              `Missing recommended structured data for ${pageType} page`,
              `Add ${recommendedTypes.join(' or ')} schema markup`,
              recommendedTypes
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
        issues.push(this.createIssue(
          'medium',
          `${incompleteSchemas.length} schema(s) have minimal properties`,
          'Add more properties to schemas for richer structured data',
          affectedTypes
        ));
      }
      
      // Check for missing JSON-LD format
      if (jsonLdData.length === 0) {
        issues.push(this.createIssue(
          'low',
          'No JSON-LD structured data found',
          'Consider using JSON-LD format as it is preferred by search engines'
        ));
      }
    }
    
    return this.createResult(score, evidence, issues, { scoreBreakdown }, recommendations);
  }

  extractJsonLd(html) {
    const items = [];
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

  parseJsonLdItem(data) {
    const type = data['@type'] || 'Unknown';
    const properties = Object.keys(data).filter(key => !key.startsWith('@') && key !== 'type');
    const validationErrors = [];
    
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

  extractMicrodata(html) {
    const items = [];
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

  extractRdfa(html) {
    const items = [];
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

  getRecommendedSchemas(pageType) {
    const recommendations = {
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
    
    return recommendations[pageType] || ['Organization', 'WebPage'];
  }

  hasRecommendedSchemaForPageType(items, pageType) {
    const recommendedTypes = this.getRecommendedTypes(pageType);
    const foundTypes = items.map(item => item.type.split(',')[0].trim());
    
    return recommendedTypes.some(recommended => 
      foundTypes.some(found => found.toLowerCase() === recommended.toLowerCase())
    );
  }
  
  getRecommendedTypes(pageType) {
    const typeMap = {
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

  getMissingEssentialProperties(jsonLdData) {
    // Check if essential properties are present for common schemas
    const essentialProps = {
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
    
    const missingProps = [];
    
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

  getFoundEssentialProperties(jsonLdData) {
    // Check which essential properties are present for common schemas
    const essentialProps = {
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
    
    const foundProps = [];
    
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
}

module.exports = StructuredDataRule;