const { BaseRule, EvidenceHelper } = require('../base-rule');

class SubheadingsRule extends BaseRule {
  constructor() {
    super(
      'subheadings',
      'Subheadings Structure',
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
    let score = 0;
    const scoreBreakdown = [];
    const $ = content.$;

    try {
      const h2Count = $('h2').length;
      const h3Count = $('h3').length;
      const h4Count = $('h4').length;
      const totalHeadings = h2Count + h3Count + h4Count;

      // Base score for having subheadings
      if (h2Count > 0) {
        score = 40;
        scoreBreakdown.push({ component: 'Has H2 headings', points: 40 });
        evidence.push(EvidenceHelper.success('Structure', `Found ${h2Count} H2 headings`));
      } else {
        scoreBreakdown.push({ component: 'No H2 headings', points: 0 });
        evidence.push(EvidenceHelper.error('Structure', 'No H2 headings found'));
        issues.push(this.createIssue(
          'high',
          'Missing H2 subheadings',
          'Add H2 headings to create clear content structure'
        ));
      }

      // Check content length vs heading ratio
      const bodyText = $('body').text();
      const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;
      const headingsPerWords = totalHeadings / (wordCount / 300); // Expect heading every ~300 words

      if (wordCount > 500) {
        if (headingsPerWords >= 0.8 && headingsPerWords <= 2) {
          score += 30;
          scoreBreakdown.push({ component: 'Good heading density', points: 30 });
          evidence.push(EvidenceHelper.success('Density', 'Good ratio of headings to content'));
        } else if (headingsPerWords < 0.5) {
          score += 10;
          scoreBreakdown.push({ component: 'Too few headings', points: 10 });
          evidence.push(EvidenceHelper.warning('Density', 'Content could use more headings'));
          recommendations.push('Add more subheadings to break up long content');
        } else if (headingsPerWords > 3) {
          score += 10;
          scoreBreakdown.push({ component: 'Too many headings', points: 10 });
          evidence.push(EvidenceHelper.warning('Density', 'Too many headings for content length'));
          recommendations.push('Consolidate some sections to improve flow');
        } else {
          score += 20;
          scoreBreakdown.push({ component: 'Acceptable heading density', points: 20 });
        }
      }

      // Check hierarchy
      if (h2Count > 0 && h3Count > 0) {
        score += 20;
        scoreBreakdown.push({ component: 'Good hierarchy', points: 20 });
        evidence.push(EvidenceHelper.success('Hierarchy', 'Uses multiple heading levels (H2, H3)'));
        
        // Check if H3s appear without H2s (broken hierarchy)
        let brokenHierarchy = false;
        $('h3').each((i, el) => {
          const $h3 = $(el);
          const prevH2 = $h3.prevAll('h2').first();
          if (prevH2.length === 0) {
            brokenHierarchy = true;
          }
        });
        
        if (brokenHierarchy) {
          score -= 10;
          scoreBreakdown.push({ component: 'Broken hierarchy', points: -10 });
          evidence.push(EvidenceHelper.warning('Hierarchy', 'Some H3s appear before any H2'));
          issues.push(this.createIssue(
            'medium',
            'Heading hierarchy is broken',
            'Ensure H3s only appear after H2s'
          ));
        }
      } else if (h3Count > 0 && h2Count === 0) {
        evidence.push(EvidenceHelper.error('Hierarchy', 'H3 headings without H2s'));
        issues.push(this.createIssue(
          'high',
          'Skipped heading levels',
          'Use H2 before H3 for proper hierarchy'
        ));
      }

      // Check heading text quality
      const headingQuality = this.analyzeHeadingQuality($);
      score += headingQuality.score;
      scoreBreakdown.push(...headingQuality.breakdown);
      evidence.push(...headingQuality.evidence);
      issues.push(...headingQuality.issues);

    } catch (error) {
      evidence.push(EvidenceHelper.error('Subheadings', `Error analyzing subheadings: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  analyzeHeadingQuality($) {
    const quality = {
      score: 0,
      breakdown: [],
      evidence: [],
      issues: []
    };

    const allHeadings = [];
    $('h2, h3, h4').each((i, el) => {
      allHeadings.push($(el).text().trim());
    });

    if (allHeadings.length === 0) return quality;

    // Check for meaningful headings
    const genericHeadings = allHeadings.filter(h => 
      /^(introduction|overview|conclusion|summary|more|other|misc)$/i.test(h) ||
      h.length < 3
    );

    if (genericHeadings.length === 0) {
      quality.score += 10;
      quality.breakdown.push({ component: 'Descriptive headings', points: 10 });
      quality.evidence.push(EvidenceHelper.success('Quality', 'All headings are descriptive'));
    } else {
      const genericRatio = genericHeadings.length / allHeadings.length;
      if (genericRatio > 0.3) {
        quality.breakdown.push({ component: 'Generic headings', points: 0 });
        quality.evidence.push(EvidenceHelper.warning('Quality', `${Math.round(genericRatio * 100)}% of headings are generic`));
        quality.issues.push({
          severity: 'medium',
          description: 'Many headings are too generic',
          recommendation: 'Use more descriptive, specific headings'
        });
      } else {
        quality.score += 5;
        quality.breakdown.push({ component: 'Some generic headings', points: 5 });
      }
    }

    return quality;
  }
}

module.exports = SubheadingsRule;