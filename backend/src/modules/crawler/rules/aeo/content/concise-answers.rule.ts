import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class ConciseAnswersRule extends BaseAEORule {
  constructor() {
    super(
      'concise_answers',
      'Concise, Upfront Answers',
      'CONTENT' as Category,
      {
        impactScore: 3,
        pageTypes: [],
        isDomainLevel: false
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<RuleResult> {
    const evidence: EvidenceItem[] = [];
    const recommendations: string[] = [];
    let score = 0;
    
    const html = content.html || '';
    const cleanText = content.cleanContent || '';
    
    // Check for summary or TL;DR sections
    const summaryPatterns = [
      /<(?:div|section)[^>]*(?:class|id)=[\"'][^\"']*(?:summary|tldr|key[\-_]?points?|highlights?|overview|abstract)[^\"']*[\"'][^>]*>/gi,
      /(?:^|\n)(?:tl;?dr|summary|key\s+(?:points?|takeaways?)|highlights?|overview|abstract)\s*:?\s*(?:\n|$)/gim
    ];
    
    let hasSummary = false;
    let foundSummaryText = '';
    
    // Check HTML patterns
    const htmlMatches = html.match(summaryPatterns[0]);
    if (htmlMatches) {
      hasSummary = true;
      foundSummaryText = htmlMatches[0].substring(0, 100) + (htmlMatches[0].length > 100 ? '...' : '');
    }
    
    // Check text patterns
    if (!hasSummary) {
      const textMatches = cleanText.match(summaryPatterns[1]);
      if (textMatches) {
        hasSummary = true;
        foundSummaryText = textMatches[0].trim();
      }
    }
    
    if (hasSummary) {
      evidence.push(EvidenceHelper.success('Has summary/TL;DR section', {
        code: foundSummaryText,
        target: 'Summary sections help users quickly understand key points',
        score: 25
      }));
      score += 25;
    } else {
      evidence.push(EvidenceHelper.error('No summary or key points section', {
        score: 0
      }));
    }
    
    // Check for bullet points and lists early in content
    const firstHalfHtml = html.substring(0, html.length / 2);
    const listMatches = firstHalfHtml.match(/<(?:ul|ol)[^>]*>[\s\S]*?<\/(?:ul|ol)>/gi) || [];
    const earlyLists = listMatches.length;
    
    if (earlyLists > 0) {
      // Extract list items for code snippet
      const listItems: string[] = [];
      listMatches.slice(0, 3).forEach(listHtml => {
        const items = listHtml.match(/<li[^>]*>([^<]+)<\/li>/gi) || [];
        items.slice(0, 3).forEach(item => {
          const text = item.replace(/<[^>]*>/g, '').trim();
          if (text.length > 0) {
            listItems.push(text.substring(0, 60) + (text.length > 60 ? '...' : ''));
          }
        });
      });
      
      evidence.push(EvidenceHelper.success(`Found ${earlyLists} list(s) in first half of content`, {
        code: listItems.slice(0, 5).join('\n') + (listItems.length > 5 ? '\n... (truncated)' : ''),
        target: 'Early lists help users scan and find information quickly',
        score: 20
      }));
      score += 20;
    } else {
      evidence.push(EvidenceHelper.warning('No lists in the first half of content', {
        score: 0
      }));
    }
    
    // Check for clear answer patterns
    const answerPatterns = [
      /(?:the\s+)?(?:answer|solution|result)\s+is/gi,
      /(?:in\s+)?(?:short|brief|summary)/gi,
      /(?:simply\s+)?put/gi,
      /(?:here's|here\s+is)\s+(?:what|the)/gi,
      /(?:quick|simple)\s+(?:answer|explanation)/gi
    ];
    
    let answerIndicators = 0;
    const foundIndicators: string[] = [];
    
    answerPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        answerIndicators += matches.length;
        matches.forEach(match => {
          // Get context around the match
          const matchIndex = cleanText.toLowerCase().indexOf(match.toLowerCase());
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 20);
            const end = Math.min(cleanText.length, matchIndex + match.length + 30);
            const context = cleanText.substring(start, end).trim();
            if (!foundIndicators.some(existing => existing.includes(match.toLowerCase()))) {
              foundIndicators.push(context);
            }
          }
        });
      }
    });
    
    if (answerIndicators > 0) {
      evidence.push(EvidenceHelper.success(`Found ${answerIndicators} direct answer indicators`, {
        code: foundIndicators.slice(0, 3).join('\n') + (foundIndicators.length > 3 ? '\n... (truncated)' : ''),
        target: 'Direct answer indicators signal immediate value to users',
        score: 15
      }));
      score += 15;
    } else {
      evidence.push(EvidenceHelper.warning('No clear answer indicators found', {
        score: 0
      }));
    }
    
    // Check sentence complexity in first paragraph
    const paragraphs = cleanText.split(/\n\n+/);
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0];
      const sentences = firstPara.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length > 0) {
        const avgWordsPerSentence = firstPara.split(/\s+/).length / sentences.length;
        
        if (avgWordsPerSentence <= 15) {
          evidence.push(EvidenceHelper.success(`First paragraph has concise sentences (avg ${avgWordsPerSentence.toFixed(1)} words)`, {
            score: 20
          }));
          score += 20;
        } else if (avgWordsPerSentence <= 25) {
          evidence.push(EvidenceHelper.warning(`First paragraph sentences are moderate (avg ${avgWordsPerSentence.toFixed(1)} words)`, {
            score: 10
          }));
          score += 10;
        } else {
          evidence.push(EvidenceHelper.warning(`First paragraph has long sentences (avg ${avgWordsPerSentence.toFixed(1)} words)`, {
            target: 'Aim for 15-25 words per sentence for better readability',
            score: 0
          }));
          recommendations.push('Break down long sentences in the first paragraph for better readability');
        }
      }
    }
    
    // Check for numbered steps or clear structure
    const structurePatterns = [
      /(?:^|\n)\d+\.\s+/gm,  // Numbered lists
      /(?:^|\n)(?:first|second|third|finally|lastly)\s*,/gim,
      /(?:^|\n)(?:step\s+\d+|phase\s+\d+)\s*:/gim
    ];
    
    let structureCount = 0;
    structurePatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        structureCount += matches.length;
      }
    });
    
    if (structureCount >= 3) {
      evidence.push(EvidenceHelper.success(`Clear structured format with ${structureCount} markers`, {
        score: 20
      }));
      score += 20;
    } else if (structureCount > 0) {
      evidence.push(EvidenceHelper.warning(`Some structure markers (${structureCount})`, {
        score: 10
      }));
      score += 10;
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info('◐ Excellent concise, upfront answer structure'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning('Good answer structure, could be more concise', {
        target: 'Optimize for 80+ points with more direct answers and better structure'
      }));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning('Answers could be more direct and upfront'));
    } else {
      evidence.push(EvidenceHelper.error('Lacks concise, upfront answer structure'));
    }
    
    // Calculate score breakdown
    const summaryPoints = hasSummary ? 25 : 0;
    const listPoints = earlyLists > 0 ? 20 : 0;
    const answerPoints = answerIndicators > 0 ? 15 : 0;
    let sentencePoints = 0;
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0];
      const sentences = firstPara.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 0) {
        const avgWords = firstPara.split(/\s+/).length / sentences.length;
        sentencePoints = avgWords <= 15 ? 20 : avgWords <= 25 ? 10 : 0;
      }
    }
    const structurePoints = structureCount >= 3 ? 20 : structureCount > 0 ? 10 : 0;
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (Summary: +${summaryPoints}, Lists: +${listPoints}, Answer Indicators: +${answerPoints}, Sentence Length: +${sentencePoints}, Structure: +${structurePoints})`));
    
    return this.createResult(score, evidence, undefined, undefined, recommendations);
  }
}