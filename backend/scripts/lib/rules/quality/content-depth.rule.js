const { BaseRule, EvidenceHelper } = require('../base-rule');

class ContentDepthRule extends BaseRule {
  constructor() {
    super(
      'content_depth',
      'Content Depth & Quality',
      'quality',
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
      // Extract main content area (simplified)
      const mainContent = $('main, article, [role="main"], .content, #content').first();
      const contentElement = mainContent.length > 0 ? mainContent : $('body');
      
      // Remove navigation, footer, etc.
      const contentClone = contentElement.clone();
      contentClone.find('nav, header, footer, aside, script, style').remove();
      
      const text = contentClone.text();
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      
      // Word count scoring
      if (wordCount < 300) {
        score = 10;
        scoreBreakdown.push({ component: 'Very thin content', points: 10 });
        evidence.push(EvidenceHelper.error('Length', `Only ${wordCount} words (minimum 300 recommended)`));
        issues.push(this.createIssue(
          'high',
          'Content is too thin',
          'Add more comprehensive content (aim for 600+ words)'
        ));
      } else if (wordCount < 600) {
        score = 30;
        scoreBreakdown.push({ component: 'Short content', points: 30 });
        evidence.push(EvidenceHelper.warning('Length', `${wordCount} words (600+ recommended)`));
        recommendations.push('Consider expanding content for better coverage');
      } else if (wordCount < 1000) {
        score = 50;
        scoreBreakdown.push({ component: 'Moderate content', points: 50 });
        evidence.push(EvidenceHelper.success('Length', `${wordCount} words`));
      } else {
        score = 60;
        scoreBreakdown.push({ component: 'Comprehensive content', points: 60 });
        evidence.push(EvidenceHelper.success('Length', `${wordCount} words (comprehensive)`));
      }
      
      // Check for multimedia content
      const images = contentElement.find('img').length;
      const videos = contentElement.find('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
      
      if (images > 0 || videos > 0) {
        score += 15;
        scoreBreakdown.push({ component: 'Multimedia content', points: 15 });
        evidence.push(EvidenceHelper.success('Media', `${images} images, ${videos} videos`));
      } else if (wordCount > 500) {
        evidence.push(EvidenceHelper.info('Media', 'No images or videos in content'));
        recommendations.push('Add relevant images or videos to enhance content');
      }
      
      // Check for lists and tables (structured content)
      const lists = contentElement.find('ul, ol').length;
      const tables = contentElement.find('table').length;
      
      if (lists > 0 || tables > 0) {
        score += 10;
        scoreBreakdown.push({ component: 'Structured elements', points: 10 });
        evidence.push(EvidenceHelper.success('Structure', `${lists} lists, ${tables} tables`));
      }
      
      // Check content uniqueness (very simplified - just check for common placeholder text)
      const placeholderPhrases = [
        'lorem ipsum',
        'coming soon',
        'under construction',
        'placeholder text',
        'content goes here'
      ];
      
      const lowerText = text.toLowerCase();
      const hasPlaceholder = placeholderPhrases.some(phrase => lowerText.includes(phrase));
      
      if (hasPlaceholder) {
        score = Math.max(0, score - 30);
        scoreBreakdown.push({ component: 'Placeholder content', points: -30 });
        evidence.push(EvidenceHelper.error('Quality', 'Placeholder content detected'));
        issues.push(this.createIssue(
          'critical',
          'Placeholder content found',
          'Replace placeholder text with real content'
        ));
      }
      
      // Readability check (simplified)
      const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
      
      if (avgWordsPerSentence > 25) {
        score += 5;
        scoreBreakdown.push({ component: 'Complex sentences', points: 5 });
        evidence.push(EvidenceHelper.warning('Readability', 'Sentences may be too long'));
        recommendations.push('Consider breaking up long sentences for better readability');
      } else if (avgWordsPerSentence > 0) {
        score += 15;
        scoreBreakdown.push({ component: 'Good readability', points: 15 });
        evidence.push(EvidenceHelper.success('Readability', `Average ${Math.round(avgWordsPerSentence)} words per sentence`));
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Content', `Error analyzing content depth: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }
}

module.exports = ContentDepthRule;