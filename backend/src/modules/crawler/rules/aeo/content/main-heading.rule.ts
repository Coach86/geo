import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category, EvidenceItem, RuleIssue } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { MainHeadingIssueId, createMainHeadingIssue } from './main-heading.issues';

// Evidence topics for this rule
enum MainHeadingTopic {
  TAG_PRESENCE = 'Tag Presence',
  CONTENT_LENGTH = 'Content Length',
  CONTENT_QUALITY = 'Content Quality',
  GENERIC_CHECK = 'Generic Check',
  RELATIONSHIP = 'Relationship'
}

@Injectable()
export class MainHeadingRule extends BaseAEORule {
  constructor() {
    super(
      'main_heading',
      'Main Heading (<h1>)',
      'STRUCTURE' as Category,
      {
        impactScore: 3,
        pageTypes: [],
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    let score = 0;
    const scoreBreakdown: { component: string; points: number }[] = [];
    
    const html = content.html || '';
    
    // Extract all H1 tags
    const h1Pattern = /<h1[^>]*>(.*?)<\/h1>/gi;
    const h1Matches = html.match(h1Pattern) || [];
    const h1Count = h1Matches.length;
    
    // Extract H1 text content
    const h1Texts = h1Matches.map(h1 => {
      const textMatch = h1.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (textMatch) {
        return textMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      return '';
    }).filter(text => text.length > 0);
    
    // Check H1 count and combine with length check
    if (h1Count === 1) {
      const primaryH1 = h1Texts[0];
      const h1WordCount = primaryH1.split(/\s+/).length;
      
      if (h1WordCount >= 3 && h1WordCount <= 10) {
        evidence.push(EvidenceHelper.success(MainHeadingTopic.TAG_PRESENCE, `Exactly one H1 tag found - optimal length (${h1WordCount} words)`, { 
          code: primaryH1,
          target: '3-10 words',
          score: 60,
          maxScore: 60
        }));
        score += 60; // 40 for one H1 + 20 for optimal length
        scoreBreakdown.push({ component: 'Exactly one H1 tag', points: 40 });
        scoreBreakdown.push({ component: `Optimal length (${h1WordCount} words)`, points: 20 });
      } else if (h1WordCount < 3) {
        evidence.push(EvidenceHelper.warning(MainHeadingTopic.TAG_PRESENCE, `Exactly one H1 tag found - too short (${h1WordCount} words)`, { 
          code: primaryH1,
          target: '3-10 words for +10 more points',
          score: 50,
          maxScore: 60
        }));
        score += 50; // 40 for one H1 + 10 for short length
        scoreBreakdown.push({ component: 'Exactly one H1 tag', points: 40 });
        scoreBreakdown.push({ component: `Too short (${h1WordCount} words)`, points: 10 });
      } else {
        evidence.push(EvidenceHelper.warning(MainHeadingTopic.TAG_PRESENCE, `Exactly one H1 tag found - too long (${h1WordCount} words)`, { 
          code: primaryH1,
          target: '3-10 words for +10 more points',
          score: 50,
          maxScore: 60
        }));
        score += 50; // 40 for one H1 + 10 for long length
        scoreBreakdown.push({ component: 'Exactly one H1 tag', points: 40 });
        scoreBreakdown.push({ component: `Too long (${h1WordCount} words)`, points: 10 });
      }
    } else if (h1Count === 0) {
      evidence.push(EvidenceHelper.error(MainHeadingTopic.TAG_PRESENCE, 'No H1 tag found', { 
        target: 'Add exactly one H1 tag with 3-10 words',
        score: 0,
        maxScore: 100
      }));
      scoreBreakdown.push({ component: 'No H1 tag', points: 0 });
      return this.createResult(0, evidence);
    } else {
      evidence.push(EvidenceHelper.error(MainHeadingTopic.TAG_PRESENCE, `Multiple H1 tags found (${h1Count})`, { 
        target: 'Use exactly one H1 tag',
        score: 10,
        maxScore: 100
      }));
      score += 10;
      scoreBreakdown.push({ component: `Multiple H1 tags (${h1Count})`, points: 10 });
    }
    
    // Analyze H1 content quality
    if (h1Texts.length > 0) {
      const primaryH1 = h1Texts[0];
      
      // Check for keywords and descriptiveness
      if (primaryH1.length > 20) {
        evidence.push(EvidenceHelper.success(MainHeadingTopic.CONTENT_QUALITY, 'H1 appears descriptive', {
          score: 20,
          maxScore: 20
        }));
        score += 20;
        scoreBreakdown.push({ component: 'H1 appears descriptive', points: 20 });
      } else {
        evidence.push(EvidenceHelper.warning(MainHeadingTopic.CONTENT_QUALITY, 'H1 may lack descriptiveness', { 
          target: 'Use descriptive H1 with 20+ characters for +10 more points',
          score: 10,
          maxScore: 20
        }));
        score += 10;
        scoreBreakdown.push({ component: 'H1 may lack descriptiveness', points: 10 });
      }
      
      // Check for generic/bad H1 patterns
      const genericPatterns = [
        /^(home|welcome|untitled|page \d+|hello world)$/i,
        /^(click here|read more|learn more)$/i
      ];
      
      const isGeneric = genericPatterns.some(pattern => pattern.test(primaryH1));
      if (!isGeneric) {
        evidence.push(EvidenceHelper.success(MainHeadingTopic.GENERIC_CHECK, 'H1 is not generic', {
          score: 10,
          maxScore: 10
        }));
        score += 10;
        scoreBreakdown.push({ component: 'H1 is not generic', points: 10 });
      } else {
        evidence.push(EvidenceHelper.error(MainHeadingTopic.GENERIC_CHECK, 'H1 uses generic text', { 
          target: 'Use specific, descriptive H1 text',
          score: 0,
          maxScore: 10
        }));
        scoreBreakdown.push({ component: 'H1 uses generic text', points: 0 });
      }
      
      // Check if H1 matches or relates to title tag
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const h1Lower = primaryH1.toLowerCase();
        const titleLower = titleText.toLowerCase();
        
        // Check for some overlap but not exact match
        const h1Words = h1Lower.split(/\s+/);
        const titleWords = titleLower.split(/\s+/);
        const commonWords = h1Words.filter(word => titleWords.includes(word) && word.length > 3);
        
        if (commonWords.length > 0 && h1Lower !== titleLower) {
          evidence.push(EvidenceHelper.success(MainHeadingTopic.RELATIONSHIP, 'H1 relates to title tag but is unique', {
            score: 10,
            maxScore: 10
          }));
          score += 10;
          scoreBreakdown.push({ component: 'H1 relates to title but unique', points: 10 });
        } else if (h1Lower === titleLower) {
          evidence.push(EvidenceHelper.warning(MainHeadingTopic.RELATIONSHIP, 'H1 exactly matches title tag', { 
            target: 'Make H1 unique from title for +10 points',
            score: 0,
            maxScore: 10
          }));
          scoreBreakdown.push({ component: 'H1 exactly matches title', points: 0 });
        } else {
          evidence.push(EvidenceHelper.warning(MainHeadingTopic.RELATIONSHIP, 'H1 and title tag are completely different', { 
            target: 'Ensure H1 relates to title for +10 points',
            score: 0,
            maxScore: 10
          }));
          scoreBreakdown.push({ component: 'H1 unrelated to title', points: 0 });
        }
      }
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    // Add score calculation explanation using the same format as other rules
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Generate issues based on problems found
    const issues: RuleIssue[] = [];
    if (h1Count === 0) {
      issues.push(createMainHeadingIssue(MainHeadingIssueId.NO_H1_TAG));
    } else if (h1Count > 1) {
      issues.push(createMainHeadingIssue(
        MainHeadingIssueId.MULTIPLE_H1_TAGS,
        h1Texts.slice(0, 3), // Show first 3 H1s as affected elements
        `Multiple H1 tags found (${h1Count} total)`
      ));
    } else if (h1Texts.length > 0) {
      const primaryH1 = h1Texts[0];
      const h1WordCount = primaryH1.split(/\s+/).length;
      
      if (h1WordCount < 3) {
        issues.push(createMainHeadingIssue(
          MainHeadingIssueId.H1_TOO_SHORT,
          [primaryH1],
          `H1 tag is too short (${h1WordCount} ${h1WordCount === 1 ? 'word' : 'words'})`
        ));
      } else if (h1WordCount > 10) {
        issues.push(createMainHeadingIssue(
          MainHeadingIssueId.H1_TOO_LONG,
          [primaryH1],
          `H1 tag is too long (${h1WordCount} words)`
        ));
      }
      
      const genericPatterns = [
        /^(home|welcome|untitled|page \d+|hello world)$/i,
        /^(click here|read more|learn more)$/i
      ];
      
      if (genericPatterns.some(pattern => pattern.test(primaryH1))) {
        issues.push(createMainHeadingIssue(
          MainHeadingIssueId.H1_GENERIC_TEXT,
          [primaryH1]
        ));
      }
      
      // Check for title match/mismatch
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        const titleText = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const h1Lower = primaryH1.toLowerCase();
        const titleLower = titleText.toLowerCase();
        
        if (h1Lower === titleLower) {
          issues.push(createMainHeadingIssue(
            MainHeadingIssueId.H1_MATCHES_TITLE,
            [primaryH1, titleText]
          ));
        } else {
          // Check if they're completely unrelated
          const h1Words = h1Lower.split(/\s+/);
          const titleWords = titleLower.split(/\s+/);
          const commonWords = h1Words.filter(word => titleWords.includes(word) && word.length > 3);
          
          if (commonWords.length === 0) {
            issues.push(createMainHeadingIssue(
              MainHeadingIssueId.H1_UNRELATED_TO_TITLE,
              [primaryH1, titleText]
            ));
          }
        }
      }
    }
    
    return this.createResult(score, evidence, issues);
  }
}