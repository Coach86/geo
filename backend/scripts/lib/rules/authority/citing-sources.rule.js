const { BaseRule, EvidenceHelper } = require('../base-rule');

class CitingSourcesRule extends BaseRule {
  constructor() {
    super(
      'citing_sources',
      'Citing Sources',
      'authority',
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
    let score = 20; // Base score to match TypeScript version
    const scoreBreakdown = [
      { component: 'Base score', points: 20 }
    ];
    const $ = content.$;

    try {
      // Count external links (potential sources)
      const externalLinks = $('a[href^="http"]:not([href*="' + new URL(url).hostname + '"])');
      const externalLinkCount = externalLinks.length;
      
      // Count internal links
      const internalLinks = $('a[href]').not(externalLinks);
      const internalLinkCount = internalLinks.length;
      
      // Look for citation patterns
      const citationPatterns = {
        footnotes: $('sup a, a[href^="#ref"], a[href*="footnote"]').length,
        references: $('*:contains("References"), *:contains("Sources"), *:contains("Bibliography")').length,
        quotes: $('blockquote, q').length,
        academicStyle: 0
      };
      
      // Check for academic-style citations (e.g., "(Smith, 2023)")
      const bodyText = $('body').text();
      const academicCitations = bodyText.match(/\([A-Z][a-z]+(?:\s+(?:&|and)\s+[A-Z][a-z]+)*,?\s+\d{4}\)/g);
      if (academicCitations) {
        citationPatterns.academicStyle = academicCitations.length;
      }
      
      // Calculate score based on citations
      if (externalLinkCount > 0) {
        const linkScore = Math.min(30, externalLinkCount * 5);
        score += linkScore;
        scoreBreakdown.push({ component: 'External sources', points: linkScore });
        evidence.push(EvidenceHelper.success('Sources', `${externalLinkCount} external sources linked`));
      } else {
        scoreBreakdown.push({ component: 'No external sources', points: 0 });
        evidence.push(EvidenceHelper.warning('Sources', 'No external sources cited'));
        issues.push(this.createIssue(
          'medium',
          'No external sources cited',
          'Link to authoritative external sources to build credibility'
        ));
      }
      
      // Bonus for formal citations
      const formalCitationCount = citationPatterns.footnotes + citationPatterns.academicStyle;
      if (formalCitationCount > 0) {
        score += 20;
        scoreBreakdown.push({ component: 'Formal citations', points: 20 });
        evidence.push(EvidenceHelper.success('Citations', `${formalCitationCount} formal citations found`));
      }
      
      // Check for references section
      if (citationPatterns.references > 0) {
        score = Math.min(100, score + 10);
        scoreBreakdown.push({ component: 'References section', points: 10 });
        evidence.push(EvidenceHelper.success('References', 'Dedicated references section found'));
      }
      
      // Check link quality (simplified)
      let highAuthorityLinks = 0;
      externalLinks.each((i, el) => {
        const href = $(el).attr('href');
        if (href && this.isHighAuthorityDomain(href)) {
          highAuthorityLinks++;
        }
      });
      
      if (highAuthorityLinks > 0) {
        const authorityBonus = Math.min(10, highAuthorityLinks * 2);
        score = Math.min(100, score + authorityBonus);
        scoreBreakdown.push({ component: 'High authority sources', points: authorityBonus });
        evidence.push(EvidenceHelper.success('Quality', `${highAuthorityLinks} high-authority sources`));
      }
      
      // Final adjustments
      score = Math.min(100, score);
      
      if (externalLinkCount === 0 && citationPatterns.academicStyle === 0) {
        recommendations.push('Add citations to credible sources to establish authority');
      } else if (externalLinkCount < 3) {
        recommendations.push('Consider adding more external sources to strengthen credibility');
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Citations', `Error analyzing citations: ${error.message}`));
      // Keep base score even on error, matching TypeScript behavior
      score = 20;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  isHighAuthorityDomain(url) {
    const authorityDomains = [
      '.edu', '.gov', '.mil',
      'wikipedia.org', 'britannica.com',
      'nature.com', 'science.org', 'sciencedirect.com',
      'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com',
      'reuters.com', 'apnews.com', 'bbc.com',
      'nytimes.com', 'wsj.com', 'ft.com'
    ];
    
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return authorityDomains.some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

module.exports = CitingSourcesRule;