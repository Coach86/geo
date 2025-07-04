import { Injectable } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { RuleResult, PageContent, Category , EvidenceItem } from '../../../interfaces/rule.interface';
import { EvidenceHelper } from '../../../utils/evidence.helper';

@Injectable()
export class ContentFreshnessRule extends BaseAEORule {
  constructor() {
    super(
      'content_freshness',
      'Content Freshness',
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
    const currentYear = new Date().getFullYear();
    
    // Check for date in URL
    const urlDatePattern = /\/(\d{4})\/(\d{1,2})\/|\/(\d{4})-(\d{1,2})-(\d{1,2})/;
    const urlDateMatch = url.match(urlDatePattern);
    
    if (urlDateMatch) {
      evidence.push(EvidenceHelper.success('Date found in URL structure', {
        score: 15
      }));
      score += 15;
    }
    
    // Check for publish/update date metadata
    const datePatterns = [
      /<meta[^>]*(?:property|name)=[\"'](?:article:)?(?:published_time|datePublished)[\"'][^>]*content=[\"']([^\"']+)[\"']/i,
      /<meta[^>]*(?:property|name)=[\"'](?:article:)?(?:modified_time|dateModified)[\"'][^>]*content=[\"']([^\"']+)[\"']/i,
      /<time[^>]*datetime=[\"']([^\"']+)[\"'][^>]*>/gi
    ];
    
    let publishDate: Date | null = null;
    let modifiedDate: Date | null = null;
    
    datePatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        const dateStr = matches[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          if (pattern.source.includes('published')) {
            publishDate = date;
          } else if (pattern.source.includes('modified')) {
            modifiedDate = date;
          }
        }
      }
    });
    
    if (modifiedDate !== null || publishDate !== null) {
      evidence.push(EvidenceHelper.success('Structured date metadata found', {
        score: 20
      }));
      score += 20;
      
      const dateToCheck = (modifiedDate || publishDate) as unknown as Date;
      const ageInDays = Math.floor((Date.now() - dateToCheck.getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays <= 30) {
        evidence.push(EvidenceHelper.success(`Content updated within last month (${ageInDays} days ago)`, {
          score: 25
        }));
        score += 25;
      } else if (ageInDays <= 180) {
        evidence.push(EvidenceHelper.warning(`Content updated within last 6 months (${ageInDays} days ago)`, {
          score: 15
        }));
        score += 15;
      } else if (ageInDays <= 365) {
        evidence.push(EvidenceHelper.warning(`Content is ${ageInDays} days old`, {
          score: 5
        }));
        score += 5;
      } else {
        const dateStr = dateToCheck.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        evidence.push(EvidenceHelper.error(`Content is over a year old (${ageInDays} days)`, {
          code: `Date found: ${dateStr}`,
          score: 0
        }));
      }
    } else {
      evidence.push(EvidenceHelper.error('No structured date metadata found', {
        target: 'Add meta tags with datePublished/dateModified for +20 points',
        score: 0
      }));
      recommendations.push('Add structured date metadata using meta tags or JSON-LD schema');
    }
    
    // Check for date mentions in visible content
    const visibleDatePatterns = [
      /(?:published|updated|modified|posted|last\s+(?:updated|modified))(?:\s+on)?:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
      /(?:^|\n)(?:date|published|updated):?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gim
    ];
    
    let visibleDates = 0;
    const foundDates: string[] = [];
    visibleDatePatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        visibleDates += matches.length;
        matches.forEach(match => {
          // Extract just the date part and limit length
          const dateMatch = match.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
          if (dateMatch && !foundDates.includes(dateMatch[1])) {
            foundDates.push(dateMatch[1]);
          }
        });
      }
    });
    
    if (visibleDates > 0) {
      // Check if visible dates match metadata date
      const metadataDateStr = (modifiedDate || publishDate) ? 
        (modifiedDate || publishDate)!.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
      const hasMatchingDate = metadataDateStr && foundDates.some(date => {
        try {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            const parsedDateStr = parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            return parsedDateStr === metadataDateStr;
          }
        } catch (e) {
          return false;
        }
        return false;
      });
      
      const message = hasMatchingDate ? 
        `Found ${visibleDates} visible date reference(s) matching metadata` :
        `Found ${visibleDates} visible date reference(s)`;
        
      evidence.push(EvidenceHelper.success(message, {
        code: foundDates.slice(0, 5).join('\n') + (foundDates.length > 5 ? '\n... (truncated)' : ''),
        target: 'Visible dates help users and AI understand content recency',
        score: 15
      }));
      score += 15;
    } else {
      evidence.push(EvidenceHelper.warning('No visible dates in content', {
        score: 0
      }));
      recommendations.push('Add visible publication or update dates to content');
    }
    
    // Check for year mentions
    const yearPattern = new RegExp(`\\b(${currentYear}|${currentYear - 1}|${currentYear - 2})\\b`, 'g');
    const yearMatches = cleanText.match(yearPattern) || [];
    const recentYearCount = yearMatches.length;
    
    if (recentYearCount >= 3) {
      // Get unique years and their context
      const yearContexts: string[] = [];
      const uniqueYears = [...new Set(yearMatches)];
      uniqueYears.forEach(year => {
        const contextRegex = new RegExp(`\\b\\w*\\s*${year}\\s*\\w*\\b`, 'gi');
        const contexts = cleanText.match(contextRegex) || [];
        contexts.slice(0, 3).forEach(context => {
          if (!yearContexts.some(existing => existing.includes(context.trim()))) {
            yearContexts.push(context.trim());
          }
        });
      });
      
      evidence.push(EvidenceHelper.success(`Multiple recent year references (${recentYearCount} mentions)`, {
        code: yearContexts.slice(0, 5).join('\n') + (yearContexts.length > 5 ? '\n... (truncated)' : ''),
        target: 'Recent year mentions signal current relevance',
        score: 15
      }));
      score += 15;
    } else if (recentYearCount > 0) {
      evidence.push(EvidenceHelper.warning(`Some recent year references (${recentYearCount} mentions)`, {
        score: 10
      }));
      score += 10;
    } else {
      evidence.push(EvidenceHelper.warning('No recent year mentions found', {
        score: 0
      }));
      recommendations.push('Include current year references to show content relevance');
    }
    
    // Check for freshness indicators in content
    const freshnessIndicators = [
      /(?:new|latest|recent|current|updated|revised|2024|2023)/gi,
      /(?:this\s+(?:year|month|week)|as\s+of\s+\w+\s+\d{4})/gi,
      /(?:just\s+(?:released|announced|published|launched))/gi
    ];
    
    let freshnessCount = 0;
    const foundIndicators: string[] = [];
    freshnessIndicators.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        freshnessCount += matches.length;
        matches.forEach(match => {
          // Get context around the match
          const matchIndex = cleanText.toLowerCase().indexOf(match.toLowerCase());
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 15);
            const end = Math.min(cleanText.length, matchIndex + match.length + 15);
            const context = cleanText.substring(start, end).trim();
            if (!foundIndicators.some(existing => existing.includes(match.toLowerCase()))) {
              foundIndicators.push(context);
            }
          }
        });
      }
    });
    
    if (freshnessCount >= 3) {
      evidence.push(EvidenceHelper.success(`Multiple freshness indicators (${freshnessCount})`, {
        code: foundIndicators.slice(0, 5).join('\n') + (foundIndicators.length > 5 ? '\n... (truncated)' : ''),
        target: 'Freshness indicators demonstrate content currency',
        score: 10
      }));
      score += 10;
    } else if (freshnessCount > 0) {
      evidence.push(EvidenceHelper.warning(`Some freshness indicators (${freshnessCount})`, {
        code: foundIndicators.slice(0, 3).join('\n'),
        target: 'Add more freshness indicators for +5 additional points',
        score: 5
      }));
      score += 5;
    } else {
      evidence.push(EvidenceHelper.warning('No freshness indicators found', {
        score: 0
      }));
      recommendations.push('Add freshness indicators like "latest", "updated", "current" to signal content recency');
    }
    
    // Final scoring
    score = Math.min(100, Math.max(0, score));
    
    if (score >= 80) {
      evidence.push(EvidenceHelper.info('◐ Excellent content freshness signals'));
    } else if (score >= 60) {
      evidence.push(EvidenceHelper.warning('Good freshness indicators'));
    } else if (score >= 40) {
      evidence.push(EvidenceHelper.warning('Limited freshness signals', {
        target: 'Add structured metadata, visible dates, and freshness indicators for 80+ points'
      }));
    } else {
      evidence.push(EvidenceHelper.error('Lacks content freshness indicators'));
    }
    
    // Calculate score breakdown
    const urlDatePoints = urlDateMatch ? 15 : 0;
    const metadataPoints = (modifiedDate !== null || publishDate !== null) ? 20 : 0;
    let agePoints = 0;
    if (modifiedDate !== null || publishDate !== null) {
      const dateToCheck = (modifiedDate || publishDate) as unknown as Date;
      const ageInDays = Math.floor((Date.now() - dateToCheck.getTime()) / (1000 * 60 * 60 * 24));
      agePoints = ageInDays <= 30 ? 25 : ageInDays <= 180 ? 15 : ageInDays <= 365 ? 5 : 0;
    }
    const visibleDatePoints = visibleDates > 0 ? 15 : 0;
    const yearPoints = recentYearCount >= 3 ? 15 : recentYearCount > 0 ? 10 : 0;
    const freshnessIndicatorPoints = freshnessCount >= 3 ? 10 : freshnessCount > 0 ? 5 : 0;
    evidence.push(EvidenceHelper.score(`Final Score: ${score}/100 (URL Date: +${urlDatePoints}, Metadata: +${metadataPoints}, Age: +${agePoints}, Visible Dates: +${visibleDatePoints}, Year Mentions: +${yearPoints}, Freshness Indicators: +${freshnessIndicatorPoints})`));
    
    return this.createResult(score, evidence, undefined, undefined, recommendations);
  }
}