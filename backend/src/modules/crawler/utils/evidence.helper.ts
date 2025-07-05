import { EvidenceItem, EvidenceType } from '../interfaces/rule.interface';

/**
 * Helper class for creating structured evidence items
 */
export class EvidenceHelper {
  // Basic evidence creators with required topic
  static info(topic: string, content: string, options?: { target?: string; code?: string; score?: number; maxScore?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'info', topic, content, ...options };
  }

  static success(topic: string, content: string, options?: { target?: string; code?: string; score?: number; maxScore?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'success', topic, content, ...options };
  }

  static warning(topic: string, content: string, options?: { target?: string; code?: string; score?: number; maxScore?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'warning', topic, content, ...options };
  }

  static error(topic: string, content: string, options?: { target?: string; code?: string; score?: number; maxScore?: number; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'error', topic, content, ...options };
  }


  static score(content: string, metadata?: Record<string, any>): EvidenceItem {
    return { type: 'score', topic: '', content, metadata };
  }

  static heading(content: string, metadata?: Record<string, any>): EvidenceItem {
    return { type: 'heading', topic: '', content, metadata };
  }

  static base(score: number, options?: { target?: string; metadata?: Record<string, any> }): EvidenceItem {
    return { type: 'base', topic: 'Base Score', content: 'Starting score', score, ...options };
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
      const calculationParts = scoreBreakdown.map((item, index) => {
        const formattedPoints = item.points >= 0 ? `${item.points}` : `${item.points}`;
        const part = `${formattedPoints} (${item.component})`;
        // For the first item or positive numbers, return as is
        // For negative numbers after the first item, just add space (no plus sign)
        if (index === 0 || item.points < 0) {
          return part;
        }
        return `+ ${part}`;
      });
      calculationString = calculationParts.join(' ') + ` = ${finalScore}/${maxScore}`;
    } else {
      calculationString = `${finalScore}/${maxScore}`;
    }
    
    // Return a single score item with the full calculation
    evidence.push(this.score(calculationString));
    
    return evidence;
  }
}