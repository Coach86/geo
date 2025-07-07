const { BaseRule, EvidenceHelper } = require('../base-rule');

class MetaDescriptionRule extends BaseRule {
  constructor() {
    super(
      'meta_description',
      'Meta Description',
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
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      
      if (!metaDesc) {
        score = 0;
        scoreBreakdown.push({ component: 'No meta description', points: 0 });
        evidence.push(EvidenceHelper.error('Meta', 'No meta description found'));
        issues.push(this.createIssue(
          'high',
          'Missing meta description',
          'Add a compelling meta description (150-160 characters) that summarizes the page'
        ));
      } else {
        score = 50;
        scoreBreakdown.push({ component: 'Meta description exists', points: 50 });
        evidence.push(EvidenceHelper.success('Meta', 'Meta description found'));
        
        // Analyze quality
        const quality = this.analyzeMetaDescriptionQuality(metaDesc);
        score += quality.score;
        scoreBreakdown.push(...quality.breakdown);
        evidence.push(...quality.evidence);
        issues.push(...quality.issues);
        recommendations.push(...quality.recommendations);
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Meta', `Error analyzing meta description: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  analyzeMetaDescriptionQuality(metaDesc) {
    const quality = {
      score: 0,
      breakdown: [],
      evidence: [],
      issues: [],
      recommendations: []
    };

    const length = metaDesc.length;

    // Length analysis
    if (length < 50) {
      quality.score += 10;
      quality.breakdown.push({ component: 'Too short', points: 10 });
      quality.evidence.push(EvidenceHelper.warning('Length', `Meta description too short (${length} chars)`));
      quality.issues.push(this.createIssue(
        'medium',
        'Meta description is too short',
        'Expand to 150-160 characters for optimal display'
      ));
    } else if (length > 160) {
      quality.score += 20;
      quality.breakdown.push({ component: 'Too long', points: 20 });
      quality.evidence.push(EvidenceHelper.warning('Length', `Meta description too long (${length} chars)`));
      quality.issues.push(this.createIssue(
        'medium',
        'Meta description exceeds recommended length',
        'Shorten to under 160 characters to avoid truncation'
      ));
    } else if (length >= 140 && length <= 160) {
      quality.score += 30;
      quality.breakdown.push({ component: 'Optimal length', points: 30 });
      quality.evidence.push(EvidenceHelper.success('Length', `Meta description length optimal (${length} chars)`));
    } else {
      quality.score += 25;
      quality.breakdown.push({ component: 'Good length', points: 25 });
      quality.evidence.push(EvidenceHelper.success('Length', `Meta description length good (${length} chars)`));
    }

    // Check for action words
    const actionWords = ['discover', 'learn', 'find', 'get', 'explore', 'see', 'try', 'download', 'read'];
    const hasActionWords = actionWords.some(word => metaDesc.toLowerCase().includes(word));
    
    if (hasActionWords) {
      quality.score += 10;
      quality.breakdown.push({ component: 'Has action words', points: 10 });
      quality.evidence.push(EvidenceHelper.success('Quality', 'Contains action-oriented language'));
    } else {
      quality.score += 5;
      quality.breakdown.push({ component: 'No action words', points: 5 });
      quality.recommendations.push('Consider adding action words to make the description more compelling');
    }

    // Check for special characters that might cause issues
    if (metaDesc.includes('"') || metaDesc.includes('<') || metaDesc.includes('>')) {
      quality.score += 5;
      quality.breakdown.push({ component: 'Special characters', points: 5 });
      quality.evidence.push(EvidenceHelper.warning('Characters', 'Contains special characters that may cause display issues'));
      quality.recommendations.push('Avoid quotes and HTML characters in meta descriptions');
    } else {
      quality.score += 10;
      quality.breakdown.push({ component: 'Clean text', points: 10 });
    }

    return quality;
  }
}

module.exports = MetaDescriptionRule;