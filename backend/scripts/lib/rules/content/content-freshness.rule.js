const { BaseRule, EvidenceHelper } = require('../base-rule');

class ContentFreshnessRule extends BaseRule {
  constructor() {
    super(
      'content_freshness',
      'Content Freshness',
      'content',
      {
        impactScore: 2, // Medium-high impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 50; // Base score
    const scoreBreakdown = [
      { component: 'Base score', points: 50 }
    ];
    const $ = content.$;

    try {
      // Look for date indicators in content
      const datePatterns = [
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
        /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g,
        /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g,
        /\b(updated|modified|published|last updated|posted)[\s:]+.{0,50}\d{4}/gi
      ];

      let latestDate = null;
      const bodyText = $('body').text();

      for (const pattern of datePatterns) {
        const matches = bodyText.match(pattern);
        if (matches) {
          for (const match of matches) {
            const date = this.parseDate(match);
            if (date && (!latestDate || date > latestDate)) {
              latestDate = date;
            }
          }
        }
      }

      // Check structured data for dates
      const structuredDates = this.extractStructuredDates($);
      for (const date of structuredDates) {
        if (date && (!latestDate || date > latestDate)) {
          latestDate = date;
        }
      }

      if (latestDate) {
        const ageInDays = Math.floor((new Date() - latestDate) / (1000 * 60 * 60 * 24));
        
        if (ageInDays < 90) {
          score += 50;
          scoreBreakdown.push({ component: 'Very fresh content', points: 50 });
          evidence.push(EvidenceHelper.success('Freshness', `Content updated within ${ageInDays} days`));
        } else if (ageInDays < 365) {
          score += 30;
          scoreBreakdown.push({ component: 'Recent content', points: 30 });
          evidence.push(EvidenceHelper.success('Freshness', `Content from last year (${ageInDays} days ago)`));
        } else if (ageInDays < 730) {
          score += 10;
          scoreBreakdown.push({ component: 'Aging content', points: 10 });
          evidence.push(EvidenceHelper.warning('Freshness', `Content is ${Math.floor(ageInDays/365)} years old`));
          recommendations.push('Consider updating content to maintain relevance');
        } else {
          scoreBreakdown.push({ component: 'Stale content', points: 0 });
          evidence.push(EvidenceHelper.error('Freshness', `Content is over ${Math.floor(ageInDays/365)} years old`));
          issues.push(this.createIssue(
            'high',
            'Content appears outdated',
            'Update content to maintain search relevance'
          ));
        }
      } else {
        evidence.push(EvidenceHelper.info('Freshness', 'No clear date indicators found in content'));
        recommendations.push('Add publication or update dates to content');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Freshness', `Error checking content freshness: ${error.message}`));
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  parseDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  extractStructuredDates($) {
    const dates = [];
    
    // Check schema.org structured data
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data.datePublished) dates.push(this.parseDate(data.datePublished));
        if (data.dateModified) dates.push(this.parseDate(data.dateModified));
      } catch {}
    });

    // Check meta tags
    const metaDates = [
      $('meta[property="article:published_time"]').attr('content'),
      $('meta[property="article:modified_time"]').attr('content'),
      $('meta[name="publish_date"]').attr('content'),
      $('meta[name="DC.date.issued"]').attr('content')
    ];

    for (const dateStr of metaDates) {
      if (dateStr) {
        const date = this.parseDate(dateStr);
        if (date) dates.push(date);
      }
    }

    return dates;
  }
}

module.exports = ContentFreshnessRule;