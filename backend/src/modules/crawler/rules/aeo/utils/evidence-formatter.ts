export class EvidenceFormatter {
  /**
   * Wraps code snippets in <code> tags for proper frontend rendering
   */
  static wrapCode(code: string): string {
    return `<code>${code}</code>`;
  }

  /**
   * Formats a target/goal for frontend display
   */
  static formatTarget(targetDescription: string, points?: number): string {
    if (points !== undefined) {
      return `<target>${targetDescription} (+${points} points)</target>`;
    }
    return `<target>${targetDescription}</target>`;
  }

  /**
   * Formats the final score calculation
   */
  static formatScoreCalculation(
    scoreBreakdown: Array<{ component: string; points: number }>,
    finalScore: number
  ): string[] {
    const evidence: string[] = [];
    
    evidence.push('');
    evidence.push('─────────────────────────────────────');
    evidence.push('📊 Score Calculation:');
    
    // Build the calculation string
    const calculationParts = scoreBreakdown.map(item => `${item.points} (${item.component})`);
    const calculationString = calculationParts.join(' + ');
    evidence.push(`${calculationString} = ${finalScore}/100`);
    
    return evidence;
  }

  /**
   * Formats a multi-line code block
   */
  static formatCodeBlock(lines: string[], truncated: boolean = false): string[] {
    const evidence: string[] = [];
    evidence.push('<code>');
    lines.forEach(line => evidence.push(line));
    if (truncated) {
      evidence.push('... (truncated)');
    }
    evidence.push('</code>');
    return evidence;
  }
}