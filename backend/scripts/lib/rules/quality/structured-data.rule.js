const { BaseRule, EvidenceHelper } = require('../base-rule');

class StructuredDataRule extends BaseRule {
  constructor() {
    super(
      'structured_data',
      'Structured Data',
      'quality',
      {
        impactScore: 2, // Medium-high impact
        pageTypes: ['homepage', 'blog_post_article'], // Test: only apply to specific page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 0;
    const scoreBreakdown = [];
    const $ = content.$;

    try {
      const structuredDataTypes = [];
      const structuredDataErrors = [];
      
      // Check for JSON-LD structured data
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          if (data['@type']) {
            structuredDataTypes.push(data['@type']);
          } else if (data['@graph']) {
            data['@graph'].forEach(item => {
              if (item['@type']) structuredDataTypes.push(item['@type']);
            });
          }
        } catch (e) {
          structuredDataErrors.push('Invalid JSON-LD format');
        }
      });

      // Check for microdata
      const itemscopeElements = $('[itemscope]');
      itemscopeElements.each((i, el) => {
        const itemtype = $(el).attr('itemtype');
        if (itemtype) {
          const type = itemtype.split('/').pop();
          structuredDataTypes.push(`Microdata: ${type}`);
        }
      });

      // Score based on structured data presence
      if (structuredDataTypes.length === 0 && structuredDataErrors.length === 0) {
        score = 0;
        scoreBreakdown.push({ component: 'No structured data', points: 0 });
        evidence.push(EvidenceHelper.error('Schema', 'No structured data found'));
        issues.push(this.createIssue(
          'high',
          'Missing structured data',
          'Add schema.org structured data to help search engines understand your content'
        ));
        recommendations.push('Implement Article, Product, or appropriate schema type');
      } else if (structuredDataErrors.length > 0) {
        score = 20;
        scoreBreakdown.push({ component: 'Invalid structured data', points: 20 });
        evidence.push(EvidenceHelper.error('Schema', `Found errors: ${structuredDataErrors.join(', ')}`));
        issues.push(this.createIssue(
          'high',
          'Structured data has errors',
          'Fix JSON-LD syntax errors in structured data'
        ));
      } else {
        score = 50;
        scoreBreakdown.push({ component: 'Has structured data', points: 50 });
        evidence.push(EvidenceHelper.success('Schema', `Found types: ${[...new Set(structuredDataTypes)].join(', ')}`));
        
        // Bonus for rich schema types
        const richTypes = ['Article', 'Product', 'Review', 'Recipe', 'HowTo', 'FAQ', 'Event'];
        const hasRichType = structuredDataTypes.some(type => 
          richTypes.some(richType => type.includes(richType))
        );
        
        if (hasRichType) {
          score += 30;
          scoreBreakdown.push({ component: 'Rich schema type', points: 30 });
          evidence.push(EvidenceHelper.success('Rich Schema', 'Using rich result eligible schema'));
        }
        
        // Bonus for multiple types
        if (structuredDataTypes.length > 1) {
          score += 20;
          scoreBreakdown.push({ component: 'Multiple schemas', points: 20 });
          evidence.push(EvidenceHelper.success('Coverage', 'Multiple schema types implemented'));
        }
      }

      // Check for Open Graph tags (social sharing)
      const ogTags = $('meta[property^="og:"]');
      if (ogTags.length >= 4) {
        score = Math.min(100, score + 10);
        scoreBreakdown.push({ component: 'Open Graph tags', points: 10 });
        evidence.push(EvidenceHelper.success('Social', 'Open Graph tags present'));
      } else if (ogTags.length > 0) {
        evidence.push(EvidenceHelper.info('Social', `${ogTags.length} Open Graph tags (minimum 4 recommended)`));
        recommendations.push('Add complete Open Graph tags (title, description, image, url)');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Schema', `Error analyzing structured data: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }
}

module.exports = StructuredDataRule;