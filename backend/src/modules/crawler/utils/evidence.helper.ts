import { EvidenceItem, EvidenceType } from '../interfaces/rule.interface';

/**
 * Helper class for creating structured evidence items
 */
export class EvidenceHelper {
  // Basic evidence creators with optional target, code, and score
  static info(content: string, options?: { target?: string; code?: string; score?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'info', content, ...options };
  }

  static success(content: string, options?: { target?: string; code?: string; score?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'success', content, ...options };
  }

  static warning(content: string, options?: { target?: string; code?: string; score?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'warning', content, ...options };
  }

  static error(content: string, options?: { target?: string; code?: string; score?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'error', content, ...options };
  }


  static score(content: string, metadata?: Record<string, any>): EvidenceItem {
    return { type: 'score', content, metadata };
  }

  static heading(content: string, metadata?: Record<string, any>): EvidenceItem {
    return { type: 'heading', content, metadata };
  }



  // Score calculation helper
  static scoreCalculation(
    scoreBreakdown: Array<{ component: string; points: number }>,
    finalScore: number,
    maxScore: number = 100
  ): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];
    
    // Create the calculation string
    let calculationString = '';
    if (scoreBreakdown.length > 0) {
      const calculationParts = scoreBreakdown.map(item => `${item.points} (${item.component})`);
      calculationString = calculationParts.join(' + ') + ` = ${finalScore}/${maxScore}`;
    } else {
      calculationString = `${finalScore}/${maxScore}`;
    }
    
    // Return a single score item with the full calculation
    evidence.push(this.score(calculationString));
    
    return evidence;
  }
}