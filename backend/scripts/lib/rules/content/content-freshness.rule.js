const { BaseRule, EvidenceHelper } = require('../base-rule');

class ContentFreshnessRule extends BaseRule {
  constructor() {
    super(
      'content_freshness',
      'Content Freshness',
      'quality',
      {
        impactScore: 3, // High impact (matches TypeScript version)
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 0; // Start from 0, build up based on criteria
    const scoreBreakdown = [];
    const $ = content.$;
    const currentYear = new Date().getFullYear();

    try {
      // Check for date in URL (15 points)
      const urlDatePattern = /\/(\d{4})\/(\d{1,2})\/|\/(\d{4})-(\d{1,2})-(\d{1,2})/;
      const urlDateMatch = url.match(urlDatePattern);

      if (urlDateMatch) {
        evidence.push(EvidenceHelper.success('URL Date', 'Date found in URL structure'));
        score += 15;
        scoreBreakdown.push({ component: 'URL date pattern', points: 15 });
      } else {
        evidence.push(EvidenceHelper.warning('URL Date', 'No date pattern in URL'));
        scoreBreakdown.push({ component: 'URL date pattern', points: 0 });
      }

      // Check for publish/update date metadata (20 points + 25 for content age)
      let publishDate = null;
      let modifiedDate = null;

      // Check meta tags - try multiple selectors
      const publishedSelectors = [
        'meta[property="article:published_time"]',
        'meta[name="datePublished"]',
        'meta[name="publish_date"]',
        'meta[property="og:article:published_time"]',
        'meta[name="DC.date.issued"]'
      ];
      
      const modifiedSelectors = [
        'meta[property="article:modified_time"]',
        'meta[name="dateModified"]',
        'meta[property="og:article:modified_time"]',
        'meta[name="last-modified"]'
      ];
      
      // Try each selector until we find a date
      for (const selector of publishedSelectors) {
        const content = $(selector).attr('content');
        if (content) {
          const date = this.parseDate(content);
          if (date) {
            publishDate = date;
            break;
          }
        }
      }
      
      for (const selector of modifiedSelectors) {
        const content = $(selector).attr('content');
        if (content) {
          const date = this.parseDate(content);
          if (date) {
            modifiedDate = date;
            break;
          }
        }
      }

      // Check structured data for dates
      const structuredDates = this.extractStructuredDates($);
      for (const date of structuredDates) {
        if (date && (!publishDate || date > publishDate)) {
          publishDate = date;
        }
      }
      
      // Also check for time elements with datetime attribute
      $('time[datetime]').each((i, el) => {
        const datetime = $(el).attr('datetime');
        if (datetime) {
          const date = this.parseDate(datetime);
          if (date && (!publishDate || date > publishDate)) {
            publishDate = date;
          }
        }
      });

      if (modifiedDate || publishDate) {
        evidence.push(EvidenceHelper.success('Date Metadata', 'Structured date metadata found'));
        score += 20;
        scoreBreakdown.push({ component: 'Structured date metadata', points: 20 });

        const dateToCheck = modifiedDate || publishDate;
        const ageInDays = Math.floor((new Date() - dateToCheck) / (1000 * 60 * 60 * 24));

        if (ageInDays <= 30) {
          evidence.push(EvidenceHelper.success('Content Age', `Content updated within last month (${ageInDays} days ago)`));
          score += 25;
          scoreBreakdown.push({ component: 'Very fresh content', points: 25 });
        } else if (ageInDays <= 180) {
          evidence.push(EvidenceHelper.warning('Content Age', `Content updated within last 6 months (${ageInDays} days ago)`));
          score += 15;
          scoreBreakdown.push({ component: 'Recent content', points: 15 });
        } else if (ageInDays <= 365) {
          evidence.push(EvidenceHelper.warning('Content Age', `Content is ${ageInDays} days old`));
          score += 5;
          scoreBreakdown.push({ component: 'Aging content', points: 5 });
        } else {
          const dateStr = dateToCheck.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          evidence.push(EvidenceHelper.error('Content Age', `Content is over a year old (${ageInDays} days)`, { code: `Date found: ${dateStr}` }));
          scoreBreakdown.push({ component: 'Stale content', points: 0 });
          issues.push(this.createIssue(
            'high',
            'Content appears outdated',
            'Update content to maintain search relevance'
          ));
        }
      } else {
        evidence.push(EvidenceHelper.error('Date Metadata', 'No structured date metadata found'));
        scoreBreakdown.push({ component: 'Structured date metadata', points: 0 });
        scoreBreakdown.push({ component: 'Content age', points: 0 });
        recommendations.push('Add structured date metadata using meta tags or JSON-LD schema');
        evidence.push(EvidenceHelper.error('Content Age', 'Cannot determine content age without metadata'));
      }

      // Check for visible dates in content (15 points)
      const bodyText = $('body').text() || content.cleanContent || '';
      const visibleDatePatterns = [
        /(?:published|updated|modified|posted|last\s+(?:updated|modified))(?:\s+on)?:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
        /(?:^|\n)(?:date|published|updated):?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gim
      ];

      let visibleDates = 0;
      const foundDates = [];
      for (const pattern of visibleDatePatterns) {
        const matches = bodyText.match(pattern);
        if (matches) {
          visibleDates += matches.length;
          matches.forEach(match => {
            const dateMatch = match.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
            if (dateMatch && !foundDates.includes(dateMatch[1])) {
              foundDates.push(dateMatch[1]);
            }
          });
        }
      }

      if (visibleDates > 0) {
        evidence.push(EvidenceHelper.success('Visible Dates', `Found ${visibleDates} visible date reference(s)`, { code: foundDates.slice(0, 3).join('\n') }));
        score += 15;
        scoreBreakdown.push({ component: 'Visible dates', points: 15 });
      } else {
        evidence.push(EvidenceHelper.warning('Visible Dates', 'No visible dates in content'));
        scoreBreakdown.push({ component: 'Visible dates', points: 0 });
        recommendations.push('Add visible publication or update dates to content');
      }

      // Check for year mentions (15 points)
      const yearPattern = new RegExp(`\\b(${currentYear}|${currentYear - 1}|${currentYear - 2})\\b`, 'g');
      const yearMatches = bodyText.match(yearPattern) || [];
      const recentYearCount = yearMatches.length;

      if (recentYearCount >= 3) {
        const uniqueYears = [...new Set(yearMatches)];
        evidence.push(EvidenceHelper.success('Year References', `Multiple recent year references (${recentYearCount} mentions)`, { code: uniqueYears.join(', ') }));
        score += 15;
        scoreBreakdown.push({ component: 'Multiple year references', points: 15 });
      } else if (recentYearCount > 0) {
        evidence.push(EvidenceHelper.warning('Year References', `Some recent year references (${recentYearCount} mentions)`));
        score += 10;
        scoreBreakdown.push({ component: 'Some year references', points: 10 });
      } else {
        evidence.push(EvidenceHelper.warning('Year References', 'No recent year mentions found'));
        scoreBreakdown.push({ component: 'Year references', points: 0 });
        recommendations.push('Include current year references to show content relevance');
      }

      // Check for freshness indicators (10 points)
      const freshnessPatterns = [
        /(?:new|latest|recent|current|updated|revised|2024|2023)/gi,
        /(?:this\s+(?:year|month|week)|as\s+of\s+\w+\s+\d{4})/gi,
        /(?:just\s+(?:released|announced|published|launched))/gi
      ];

      let freshnessCount = 0;
      const foundIndicators = [];
      freshnessPatterns.forEach(pattern => {
        const matches = bodyText.match(pattern);
        if (matches) {
          freshnessCount += matches.length;
          matches.slice(0, 3).forEach(match => {
            if (!foundIndicators.includes(match)) {
              foundIndicators.push(match);
            }
          });
        }
      });

      if (freshnessCount >= 3) {
        evidence.push(EvidenceHelper.success('Freshness Indicators', `Multiple freshness indicators (${freshnessCount})`, { code: foundIndicators.slice(0, 5).join('\n') }));
        score += 10;
        scoreBreakdown.push({ component: 'Multiple freshness indicators', points: 10 });
      } else if (freshnessCount > 0) {
        evidence.push(EvidenceHelper.warning('Freshness Indicators', `Some freshness indicators (${freshnessCount})`, { code: foundIndicators.join('\n') }));
        score += 5;
        scoreBreakdown.push({ component: 'Some freshness indicators', points: 5 });
      } else {
        evidence.push(EvidenceHelper.warning('Freshness Indicators', 'No freshness indicators found'));
        scoreBreakdown.push({ component: 'Freshness indicators', points: 0 });
        recommendations.push('Add freshness indicators like "latest", "updated", "current" to signal content recency');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Freshness', `Error checking content freshness: ${error.message}`));
    }

    // Cap score at 100
    score = Math.min(100, score);
    
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  parseDate(dateStr) {
    try {
      if (!dateStr || typeof dateStr !== 'string') return null;
      
      // Try parsing the date directly first
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Try some common date formats if direct parsing fails
      // Handle formats like "20 December 2023" or "December 20, 2023"
      const cleanDateStr = dateStr.trim().replace(/(\d+)(st|nd|rd|th)/, '$1');
      date = new Date(cleanDateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Handle ISO date without time
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        date = new Date(dateStr + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      return null;
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
        if (data.datePublished) {
          const date = this.parseDate(data.datePublished);
          if (date) dates.push(date);
        }
        if (data.dateModified) {
          const date = this.parseDate(data.dateModified);
          if (date) dates.push(date);
        }
        // Handle @graph structure
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          data['@graph'].forEach(item => {
            if (item.datePublished) {
              const date = this.parseDate(item.datePublished);
              if (date) dates.push(date);
            }
            if (item.dateModified) {
              const date = this.parseDate(item.dateModified);
              if (date) dates.push(date);
            }
          });
        }
      } catch {}
    });

    return dates.filter(date => date !== null);
  }
}

module.exports = ContentFreshnessRule;