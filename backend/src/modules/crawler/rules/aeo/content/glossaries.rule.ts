import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';
import { PageCategoryType } from '../../../interfaces/page-category.interface';

@Injectable()
export class GlossariesRule extends BaseAEORule {
  constructor() {
    super(
      'glossaries',
      'Glossaries & Terminology Pages',
      'CONTENT' as Category,
      {
        impactScore: 2,
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
    
    // Check URL for glossary indicators
    if (/(?:glossary|dictionary|terminology|definitions|terms)/i.test(urlLower)) {
      evidence.push(EvidenceHelper.success('URL indicates glossary/terminology content', { target: 'guidance', score: 25 }));
      score += 25;
    }
    
    // Check for glossary patterns in content
    const glossaryPatterns = [
      /glossary/gi,
      /dictionary/gi,
      /terminology/gi,
      /key\s+terms/gi,
      /definitions?/gi,
      /terms?\s+and\s+definitions?/gi
    ];
    
    let glossaryMatches = 0;
    glossaryPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        glossaryMatches += matches.length;
      }
    });
    
    if (glossaryMatches >= 3) {
      evidence.push(EvidenceHelper.success(`Found ${glossaryMatches} glossary/terminology indicators`, { target: 'guidance', score: 30 }));
      score += 30;
    } else if (glossaryMatches > 0) {
      evidence.push(EvidenceHelper.warning(`Found ${glossaryMatches} glossary indicators`, { target: 'guidance', score: 15 }));
      score += 15;
    } else {
      evidence.push(EvidenceHelper.error('No glossary patterns found'));
    }
    
    // Check for definition list structures
    const definitionLists = (html.match(/<dl[^>]*>/gi) || []).length;
    const dtElements = (html.match(/<dt[^>]*>/gi) || []).length;
    const ddElements = (html.match(/<dd[^>]*>/gi) || []).length;
    
    if (definitionLists > 0 && dtElements > 0 && ddElements > 0) {
      evidence.push(EvidenceHelper.success(`Semantic definition lists found (${dtElements} terms, ${ddElements} definitions)`, { target: 'guidance', score: 25 }));
      score += 25;
    } else if (dtElements > 0 || ddElements > 0) {
      evidence.push(EvidenceHelper.warning('Some definition elements found', { target: 'guidance', score: 10 }));
      score += 10;
    } else {
      evidence.push(EvidenceHelper.warning('No semantic definition structures'));
    }
    
    // Check for alphabetical organization
    const alphabeticalPatterns = [
      /(?:^|\n)[A-Z]\s*(?:\n|$)/gm,  // Letter headers
      /sorted\s+alphabetically/gi,
      /a-z\s+index/gi,
      /alphabetical\s+(?:order|list)/gi
    ];
    
    let hasAlphabetical = false;
    alphabeticalPatterns.forEach(pattern => {
      if (pattern.test(cleanText)) {
        hasAlphabetical = true;
      }
    });
    
    if (hasAlphabetical) {
      evidence.push(EvidenceHelper.success('Alphabetical organization detected', { target: 'guidance', score: 10 }));
      score += 10;
    }
    
    // Check for cross-references
    const crossRefPatterns = [
      /see\s+also/gi,
      /related\s+terms?/gi,
      /cf\./gi,
      /compare/gi
    ];
    
    let crossRefCount = 0;
    crossRefPatterns.forEach(pattern => {
      const matches = lowerText.match(pattern);
      if (matches) {
        crossRefCount += matches.length;
      }
    });
    
    if (crossRefCount >= 3) {
      evidence.push(EvidenceHelper.success(`Multiple cross-references found (${crossRefCount})`, { target: 'guidance', score: 10 }));
      score += 10;
    } else if (crossRefCount > 0) {
      evidence.push(EvidenceHelper.warning(`Some cross-references (${crossRefCount})`, { target: 'guidance', score: 5 }));
      score += 5;
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info('◐ Excellent glossary/terminology structure'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning('Good glossary content'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning('Basic glossary elements'));
    } else {
      evidence.push(EvidenceHelper.error('Lacks glossary structure'));
    }
    
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100`));
    
    return this.createResult(score, evidence);
  }
}