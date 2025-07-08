const { BaseRule, EvidenceHelper } = require('../base-rule');

class SubheadingsRule extends BaseRule {
  constructor() {
    super(
      'subheadings',
      'Subheadings Structure',
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
      // Extract all heading levels using regex (matching TypeScript implementation)
      const html = content.html || '';
      const h2Matches = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
      const h3Matches = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || [];
      const h4Matches = html.match(/<h4[^>]*>[\s\S]*?<\/h4>/gi) || [];
      const h5Matches = html.match(/<h5[^>]*>[\s\S]*?<\/h5>/gi) || [];
      const h6Matches = html.match(/<h6[^>]*>[\s\S]*?<\/h6>/gi) || [];
      
      const h2Count = h2Matches.length;
      const h3Count = h3Matches.length;
      const h4Count = h4Matches.length;
      const h5Count = h5Matches.length;
      const h6Count = h6Matches.length;
      const totalSubheadings = h2Count + h3Count + h4Count + h5Count + h6Count;

      // Calculate word count from clean content (matching TypeScript implementation)
      const cleanText = content.cleanContent || $('body').text();
      const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;

      // If no content or very short, not applicable
      if (wordCount < 50) {
        evidence.push(EvidenceHelper.warning('Content Length', 'Content too short to evaluate subheadings'));
        return this.createResult(0, evidence, issues, {}, recommendations);
      }

      // Check if there are any subheadings
      if (totalSubheadings === 0) {
        evidence.push(EvidenceHelper.error('No Subheadings', 'No subheadings found (H2-H6)', { 
          target: 'Add descriptive subheadings to break up content', 
          score: 20 
        }));
        score = 20;
        scoreBreakdown.push({ component: 'No subheadings', points: 20 });
        issues.push(this.createIssue(
          'high',
          'No subheadings found',
          'Add H2-H6 headings to create clear content structure'
        ));
      } else {
        // Calculate subheading density
        const wordsPerSubheading = Math.round(wordCount / totalSubheadings);
        
        // Build heading counts summary
        const headingCounts = [];
        if (h2Count > 0) headingCounts.push(`${h2Count} H2`);
        if (h3Count > 0) headingCounts.push(`${h3Count} H3`);
        if (h4Count > 0) headingCounts.push(`${h4Count} H4`);
        if (h5Count > 0) headingCounts.push(`${h5Count} H5`);
        if (h6Count > 0) headingCounts.push(`${h6Count} H6`);
        
        evidence.push(EvidenceHelper.info('Heading Analysis', `Found ${totalSubheadings} subheadings (${headingCounts.join(', ')})`));

        // Score based on density (following TypeScript version logic)
        if (wordsPerSubheading <= 100) {
          evidence.push(EvidenceHelper.success('Density', `Excellent density: 1 subheading every ${wordsPerSubheading} words`, { 
            target: '≤100 words per subheading' 
          }));
          score = 90;
          scoreBreakdown.push({ component: 'Excellent density (≤100 words)', points: 90 });
        } else if (wordsPerSubheading <= 199) {
          evidence.push(EvidenceHelper.success('Density', `Good density: 1 subheading every ${wordsPerSubheading} words`, { 
            target: '≤100 words per subheading for +10 points' 
          }));
          score = 80;
          scoreBreakdown.push({ component: 'Good density (100-199 words)', points: 80 });
        } else if (wordsPerSubheading <= 300) {
          evidence.push(EvidenceHelper.warning('Density', `Moderate density: 1 subheading every ${wordsPerSubheading} words`, { 
            target: '≤100 words per subheading for +30 points' 
          }));
          score = 60;
          scoreBreakdown.push({ component: 'Moderate density (200-300 words)', points: 60 });
        } else {
          evidence.push(EvidenceHelper.error('Density', `Poor density: 1 subheading every ${wordsPerSubheading} words`, { 
            target: '≤100 words per subheading for +50 points' 
          }));
          score = 40;
          scoreBreakdown.push({ component: 'Poor density (>300 words)', points: 40 });
          recommendations.push('Add more subheadings to break up long content sections');
        }

        // Check for question-based H2s (matching TypeScript implementation)
        const h2Texts = h2Matches.map(match => {
          // Extract text content from H2, handling nested HTML tags and multiline content
          const textMatch = match.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          if (textMatch) {
            // Remove HTML tags and get clean text
            const htmlContent = textMatch[1];
            const cleanText = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            return cleanText;
          }
          return '';
        }).filter(text => text.length > 0);

        const questionH2s = h2Texts.filter(text => text.includes('?'));
        const questionPercentage = h2Texts.length > 0 ? (questionH2s.length / h2Texts.length) * 100 : 0;

        if (questionPercentage >= 30) {
          evidence.push(EvidenceHelper.success('Question-based H2s', `${Math.round(questionPercentage)}% of H2s are question-based`, { 
            target: '≥30% question-based H2s' 
          }));
          score += 10; // Add question-based bonus
          scoreBreakdown.push({ component: 'Question-based H2s bonus', points: 10 });
        } else if (questionPercentage > 0) {
          evidence.push(EvidenceHelper.warning('Question-based H2s', `${Math.round(questionPercentage)}% of H2s are question-based`, { 
            target: '≥30% for +10 points' 
          }));
          const partialBonus = Math.round(questionPercentage * 10 / 30);
          score += partialBonus;
          scoreBreakdown.push({ component: 'Partial question-based H2s bonus', points: partialBonus });
        } else {
          evidence.push(EvidenceHelper.warning('Question-based H2s', 'No question-based H2s found', { 
            target: '≥30% question-based H2s for +10 points' 
          }));
        }

        // Check for generic headings
        const genericHeadings = ['introduction', 'overview', 'more info', 'details', 'conclusion', 'summary'];
        const genericCount = h2Texts.filter(text => 
          genericHeadings.some(generic => text.toLowerCase() === generic.toLowerCase())
        ).length;

        if (genericCount > 0) {
          const penalty = genericCount * 5;
          evidence.push(EvidenceHelper.warning('Generic Headings', `Found ${genericCount} generic subheading(s)`, { 
            target: 'Use descriptive, keyword-rich subheadings' 
          }));
          score = Math.max(20, score - penalty);
          scoreBreakdown.push({ component: 'Generic headings penalty', points: -penalty });
          recommendations.push('Replace generic headings with more descriptive, specific titles');
        }


        // Check heading hierarchy (simplified for regex-based approach)
        const hasProperHierarchy = this.checkHeadingHierarchy(html);
        if (!hasProperHierarchy) {
          evidence.push(EvidenceHelper.warning('Hierarchy', 'Improper heading hierarchy detected', { 
            target: 'Ensure H3s follow H2s, H4s follow H3s, etc.' 
          }));
          score = Math.max(20, score - 10);
          scoreBreakdown.push({ component: 'Improper hierarchy penalty', points: -10 });
          issues.push(this.createIssue(
            'medium',
            'Heading hierarchy is broken',
            'Ensure proper heading order (H2 before H3, etc.)'
          ));
        }
      }

      // Cap score at 100
      score = Math.min(100, Math.max(20, score));

    } catch (error) {
      evidence.push(EvidenceHelper.error('Subheadings', `Error analyzing subheadings: ${error.message}`));
      score = 20; // Default to base score on error
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  // Check heading hierarchy (simplified version)
  checkHeadingHierarchy(html) {
    // Simple check: ensure H3s don't appear before H2s
    const h2Index = html.search(/<h2[^>]*>/i);
    const h3Index = html.search(/<h3[^>]*>/i);
    
    // If H3 exists but appears before first H2, hierarchy is broken
    if (h3Index !== -1 && h2Index !== -1 && h3Index < h2Index) {
      return false;
    }
    
    // If H3 exists but no H2 exists, hierarchy is broken
    if (h3Index !== -1 && h2Index === -1) {
      return false;
    }
    
    return true;
  }
}

module.exports = SubheadingsRule;