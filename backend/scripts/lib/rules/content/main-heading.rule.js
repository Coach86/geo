const { BaseRule, EvidenceHelper } = require('../base-rule');

class MainHeadingRule extends BaseRule {
  constructor() {
    super(
      'main_heading',
      'Main Heading (H1)',
      'content',
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
    let score = 0;
    const scoreBreakdown = [];
    const $ = content.$;

    try {
      const h1Elements = $('h1');
      const h1Count = h1Elements.length;
      
      if (h1Count === 0) {
        score = 0;
        scoreBreakdown.push({ component: 'No H1', points: 0 });
        evidence.push(EvidenceHelper.error('H1', 'No H1 heading found on page'));
        issues.push(this.createIssue(
          'critical',
          'Missing H1 heading',
          'Add a clear, descriptive H1 heading that summarizes the page content'
        ));
      } else if (h1Count === 1) {
        score = 50;
        scoreBreakdown.push({ component: 'H1 present', points: 50 });
        evidence.push(EvidenceHelper.success('H1', 'Single H1 heading found'));
        
        // Analyze H1 quality
        const h1Text = h1Elements.first().text().trim();
        const h1Quality = this.analyzeH1Quality(h1Text, content);
        
        score += h1Quality.score;
        scoreBreakdown.push(...h1Quality.breakdown);
        evidence.push(...h1Quality.evidence);
        issues.push(...h1Quality.issues);
        recommendations.push(...h1Quality.recommendations);
        
      } else {
        score = 30;
        scoreBreakdown.push({ component: 'Multiple H1s', points: 30 });
        evidence.push(EvidenceHelper.warning('H1', `Found ${h1Count} H1 headings (should have only 1)`));
        issues.push(this.createIssue(
          'high',
          'Multiple H1 headings found',
          'Use only one H1 per page for clear content hierarchy'
        ));
        
        // Still analyze the first H1
        const h1Text = h1Elements.first().text().trim();
        const h1Quality = this.analyzeH1Quality(h1Text, content);
        score += Math.round(h1Quality.score * 0.7); // Reduce quality score due to multiple H1s
        evidence.push(...h1Quality.evidence);
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('H1', `Error analyzing H1: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  analyzeH1Quality(h1Text, content) {
    const quality = {
      score: 0,
      breakdown: [],
      evidence: [],
      issues: [],
      recommendations: []
    };

    // Check if H1 exists and has content
    if (!h1Text) {
      quality.evidence.push(EvidenceHelper.error('H1 Content', 'H1 is empty'));
      quality.issues.push(this.createIssue(
        'critical',
        'H1 heading is empty',
        'Add meaningful text to the H1 heading'
      ));
      return quality;
    }

    // Length check
    if (h1Text.length < 10) {
      quality.score += 5;
      quality.breakdown.push({ component: 'H1 too short', points: 5 });
      quality.evidence.push(EvidenceHelper.warning('H1 Length', `H1 is very short (${h1Text.length} chars)`));
      quality.issues.push(this.createIssue(
        'medium',
        'H1 heading is too short',
        'Use a more descriptive H1 (20-60 characters recommended)'
      ));
    } else if (h1Text.length > 70) {
      quality.score += 15;
      quality.breakdown.push({ component: 'H1 too long', points: 15 });
      quality.evidence.push(EvidenceHelper.warning('H1 Length', `H1 is quite long (${h1Text.length} chars)`));
      quality.recommendations.push('Consider shortening the H1 to under 60 characters');
    } else {
      quality.score += 25;
      quality.breakdown.push({ component: 'H1 good length', points: 25 });
      quality.evidence.push(EvidenceHelper.success('H1 Length', `H1 length is good (${h1Text.length} chars)`));
    }

    // Check for keyword stuffing
    const words = h1Text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    const repeatedWords = Object.entries(wordCounts).filter(([word, count]) => count > 2);
    if (repeatedWords.length > 0) {
      quality.score += 5;
      quality.breakdown.push({ component: 'Keyword repetition', points: 5 });
      quality.evidence.push(EvidenceHelper.warning('Keywords', 'Possible keyword stuffing in H1'));
      quality.issues.push(this.createIssue(
        'medium',
        'H1 contains repeated words',
        'Use natural language without keyword stuffing'
      ));
    } else {
      quality.score += 10;
      quality.breakdown.push({ component: 'Natural language', points: 10 });
      quality.evidence.push(EvidenceHelper.success('Keywords', 'H1 uses natural language'));
    }

    // Check if H1 matches or relates to title tag
    const title = content.metadata?.title || '';
    if (title && this.calculateSimilarity(h1Text, title) > 0.7) {
      quality.score += 15;
      quality.breakdown.push({ component: 'H1-Title alignment', points: 15 });
      quality.evidence.push(EvidenceHelper.success('Alignment', 'H1 aligns well with page title'));
    } else if (title) {
      quality.score += 5;
      quality.breakdown.push({ component: 'H1-Title mismatch', points: 5 });
      quality.evidence.push(EvidenceHelper.info('Alignment', 'H1 differs significantly from title'));
      quality.recommendations.push('Consider aligning H1 with page title for consistency');
    }

    return quality;
  }

  calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }
}

module.exports = MainHeadingRule;