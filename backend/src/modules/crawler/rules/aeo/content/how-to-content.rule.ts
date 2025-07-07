import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { PageCategoryType } from '../../../interfaces/page-category.interface';


// Evidence topics for this rule
enum HowToContentTopic {
  INSTRUCTIONAL_PATTERNS = 'Instructional Patterns',
  ACTION_VERBS = 'Action Verbs',
  NO_INSTRUCTIONS = 'No Instructions',
  STEP_STRUCTURE = 'Step Structure'
}

@Injectable()
export class HowToContentRule extends BaseAEORule {
  constructor() {
    super(
      'how_to_content',
      'How-to & Instructional Content',
      'QUALITY' as Category,
      {
        impactScore: 3,
        pageTypes: [PageCategoryType.BLOG_POST_ARTICLE, PageCategoryType.HOW_TO_GUIDE_TUTORIAL, PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER],
        isDomainLevel: true
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    let score = 0;
    
    const html = content.html || '';
    const cleanText = content.cleanContent || '';
    const lowerText = cleanText.toLowerCase();
    
    // Check for how-to patterns in content
    const howToPatterns = [
      /how\s+to\s+/gi,
      /step\s+\d+/gi,
      /step-by-step/gi,
      /instructions?\s+for/gi,
      /guide\s+to/gi,
      /tutorial/gi,
      /walkthrough/gi
    ];
    
    let howToMatches = 0;
    howToPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        howToMatches += matches.length;
      }
    });
    
    if (howToMatches > 0) {
      evidence.push(EvidenceHelper.success(HowToContentTopic.INSTRUCTIONAL_PATTERNS, `Found ${howToMatches} how-to/instructional patterns`, { target: 'How-to patterns', score: 30, maxScore: 30 }));
      score += 30;
    } else {
      evidence.push(EvidenceHelper.error(HowToContentTopic.NO_INSTRUCTIONS, 'No how-to or instructional patterns found', { target: 'Add how-to patterns', score: 0, maxScore: 30 }));
    }
    
    // Check for numbered or bulleted lists (common in instructions)
    const orderedLists = (html.match(/<ol[^>]*>/gi) || []).length;
    const unorderedLists = (html.match(/<ul[^>]*>/gi) || []).length;
    const totalLists = orderedLists + unorderedLists;
    
    if (totalLists > 0) {
      evidence.push(EvidenceHelper.success(HowToContentTopic.INSTRUCTIONAL_PATTERNS, `Found ${totalLists} lists (${orderedLists} ordered, ${unorderedLists} unordered)`, { target: 'Structured lists', score: 20, maxScore: 20 }));
      score += 20;
    } else {
      evidence.push(EvidenceHelper.warning(HowToContentTopic.NO_INSTRUCTIONS, 'No structured lists found for step-by-step instructions', { target: 'Add structured lists', score: 0, maxScore: 20 }));
    }
    
    // Check for action verbs at beginning of sentences
    const actionVerbs = [
      'click', 'select', 'choose', 'enter', 'type', 'press', 'navigate',
      'open', 'close', 'save', 'download', 'upload', 'install', 'configure',
      'set', 'enable', 'disable', 'create', 'delete', 'update', 'modify'
    ];
    
    const sentences = cleanText.split(/[.!?]+/);
    let actionVerbCount = 0;
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim().toLowerCase();
      if (actionVerbs.some(verb => trimmed.startsWith(verb))) {
        actionVerbCount++;
      }
    });
    
    if (actionVerbCount >= 3) {
      evidence.push(EvidenceHelper.success(HowToContentTopic.INSTRUCTIONAL_PATTERNS, `Found ${actionVerbCount} sentences starting with action verbs`, { target: 'Action verbs', score: 20, maxScore: 20 }));
      score += 20;
    } else if (actionVerbCount > 0) {
      evidence.push(EvidenceHelper.warning(HowToContentTopic.INSTRUCTIONAL_PATTERNS, `Found only ${actionVerbCount} sentences with action verbs`, { target: 'More action verbs needed', score: 10, maxScore: 20 }));
      score += 10;
    } else {
      evidence.push(EvidenceHelper.error(HowToContentTopic.ACTION_VERBS, 'No sentences starting with action verbs', { target: 'Add action verbs', score: 0, maxScore: 20 }));
    }
    
    // Check for visual aids mentions
    const visualPatterns = [
      /screenshot/gi,
      /diagram/gi,
      /figure\s+\d+/gi,
      /image\s+shows/gi,
      /see\s+the\s+(?:image|screenshot|diagram)/gi,
      /as\s+shown\s+(?:below|above)/gi
    ];
    
    let visualReferences = 0;
    visualPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        visualReferences += matches.length;
      }
    });
    
    if (visualReferences > 0) {
      evidence.push(EvidenceHelper.success(HowToContentTopic.INSTRUCTIONAL_PATTERNS, `Found ${visualReferences} references to visual aids`, { target: 'Visual aids', score: 15, maxScore: 15 }));
      score += 15;
    } else {
      evidence.push(EvidenceHelper.warning(HowToContentTopic.ACTION_VERBS, 'No references to visual aids or screenshots', { target: 'Add visual aids', score: 0, maxScore: 15 }));
    }
    
    // Check for outcome/result descriptions
    const outcomePatterns = [
      /you\s+will\s+(?:be\s+able|have|see|get)/gi,
      /after\s+(?:completing|following)\s+(?:these\s+)?(?:steps|instructions)/gi,
      /result\s+(?:will\s+be|is)/gi,
      /you\s+should\s+(?:now\s+)?(?:see|have)/gi
    ];
    
    let outcomeMatches = 0;
    outcomePatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        outcomeMatches += matches.length;
      }
    });
    
    if (outcomeMatches > 0) {
      evidence.push(EvidenceHelper.success(HowToContentTopic.INSTRUCTIONAL_PATTERNS, `Found ${outcomeMatches} outcome/result descriptions`, { target: 'Outcome descriptions', score: 15, maxScore: 15 }));
      score += 15;
    } else {
      evidence.push(EvidenceHelper.warning(HowToContentTopic.ACTION_VERBS, 'No clear outcome or result descriptions', { target: 'Add outcome descriptions', score: 0, maxScore: 15 }));
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info(HowToContentTopic.STEP_STRUCTURE, '◐ Excellent how-to/instructional content structure'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning(HowToContentTopic.INSTRUCTIONAL_PATTERNS, 'Good instructional content, could be enhanced'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning(HowToContentTopic.ACTION_VERBS, 'Limited instructional value'));
    } else {
      evidence.push(EvidenceHelper.error(HowToContentTopic.STEP_STRUCTURE, 'Lacks instructional content structure'));
    }
    
    // Calculate score breakdown
    const howToPoints = howToMatches > 0 ? 30 : 0;
    const listPoints = totalLists > 0 ? 20 : 0;
    const actionVerbPoints = actionVerbCount >= 3 ? 20 : actionVerbCount > 0 ? 10 : 0;
    const visualPoints = visualReferences > 0 ? 15 : 0;
    const outcomePoints = outcomeMatches > 0 ? 15 : 0;
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (How-to Patterns: +${howToPoints}, Lists: +${listPoints}, Action Verbs: +${actionVerbPoints}, Visual Aids: +${visualPoints}, Outcomes: +${outcomePoints})`));
    
    return this.createResult(score, evidence);
  }
}