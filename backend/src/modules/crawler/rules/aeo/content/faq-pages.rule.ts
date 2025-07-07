import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { PageCategoryType } from '../../../interfaces/page-category.interface';


// Evidence topics for this rule
enum FAQPagesTopic {
  FAQ_PATTERNS = 'Faq Patterns',
  INTERACTIVE_ELEMENTS = 'Interactive Elements',
  NO_QA_PATTERNS = 'No Qa Patterns',
  SCHEMA = 'Schema',
  STRUCTURE = 'Structure'
}

@Injectable()
export class FAQPagesRule extends BaseAEORule {
  constructor() {
    super(
      'faq_pages',
      'FAQ & Q&A Pages',
      'QUALITY' as Category,
      {
        impactScore: 3,
        pageTypes: [PageCategoryType.FAQ_GLOSSARY_PAGES],
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
    const urlLower = url.toLowerCase();
    
    // Check URL for FAQ indicators
    if (/(?:faq|frequently[\-_]asked|questions?|q&a|qanda)/i.test(urlLower)) {
      evidence.push(EvidenceHelper.success(FAQPagesTopic.FAQ_PATTERNS, 'URL indicates FAQ/Q&A content', { target: 'guidance', score: 20, maxScore: 20 }));
      score += 20;
    }
    
    // Check for Q&A patterns
    const qaPatterns = [
      /(?:^|\n)(?:q:|question:?)\s*[^\n]+\n+(?:a:|answer:?)\s*/gim,
      /\?[\s\S]{1,200}(?:answer|response|solution):/gi,
      /frequently\s+asked\s+questions?/gi,
      /faq/gi,
      /q\s*&\s*a/gi
    ];
    
    let qaMatches = 0;
    qaPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        qaMatches += matches.length;
      }
    });
    
    if (qaMatches >= 5) {
      evidence.push(EvidenceHelper.success(FAQPagesTopic.FAQ_PATTERNS, `Found ${qaMatches} Q&A patterns`, { target: 'guidance', score: 30, maxScore: 30 }));
      score += 30;
    } else if (qaMatches > 0) {
      evidence.push(EvidenceHelper.warning(FAQPagesTopic.FAQ_PATTERNS, `Found ${qaMatches} Q&A patterns`, { target: 'guidance', score: 15, maxScore: 30 }));
      score += 15;
    } else {
      evidence.push(EvidenceHelper.error(FAQPagesTopic.NO_QA_PATTERNS, 'No Q&A patterns found'));
    }
    
    // Count question marks
    const questionMarks = (cleanText.match(/\?/g) || []).length;
    
    if (questionMarks >= 5) {
      evidence.push(EvidenceHelper.success(FAQPagesTopic.FAQ_PATTERNS, `Found ${questionMarks} questions`, { target: 'guidance', score: 20, maxScore: 20 }));
      score += 20;
    } else if (questionMarks >= 2) {
      evidence.push(EvidenceHelper.warning(FAQPagesTopic.FAQ_PATTERNS, `Found ${questionMarks} questions`, { target: 'guidance', score: 10, maxScore: 20 }));
      score += 10;
    } else {
      evidence.push(EvidenceHelper.warning(FAQPagesTopic.NO_QA_PATTERNS, 'Few or no questions found'));
    }
    
    // Check for FAQ schema markup
    const faqSchemaPattern = /"@type"\s*:\s*"(?:FAQPage|Question)"/gi;
    if (faqSchemaPattern.test(html)) {
      evidence.push(EvidenceHelper.success(FAQPagesTopic.SCHEMA, 'FAQ schema markup present', { target: 'guidance', score: 20, maxScore: 20 }));
      score += 20;
    } else {
      evidence.push(EvidenceHelper.warning(FAQPagesTopic.SCHEMA, 'No FAQ schema markup'));
    }
    
    // Check for accordion/collapsible patterns
    const accordionPatterns = [
      /class=[\"'][^\"']*(?:accordion|collapse|expand|toggle)[^\"']*[\"']/gi,
      /<details[^>]*>/gi,
      /data-toggle=[\"']collapse[\"']/gi
    ];
    
    let hasAccordion = false;
    accordionPatterns.forEach(pattern => {
      if (pattern.test(html)) {
        hasAccordion = true;
      }
    });
    
    if (hasAccordion) {
      evidence.push(EvidenceHelper.success(FAQPagesTopic.INTERACTIVE_ELEMENTS, 'Interactive Q&A elements detected', { target: 'guidance', score: 10, maxScore: 10 }));
      score += 10;
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info(FAQPagesTopic.STRUCTURE, '◐ Excellent FAQ/Q&A structure'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning(FAQPagesTopic.FAQ_PATTERNS, 'Good FAQ content'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning(FAQPagesTopic.INTERACTIVE_ELEMENTS, 'Basic FAQ elements'));
    } else {
      evidence.push(EvidenceHelper.error(FAQPagesTopic.STRUCTURE, 'Lacks FAQ/Q&A structure'));
    }
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100`));
    
    return this.createResult(score, evidence);
  }
}