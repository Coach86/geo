/**
 * Base class for all scoring rules
 */
class BaseRule {
  constructor(id, name, dimension, config = {}) {
    this.id = id;
    this.name = name;
    this.dimension = dimension;
    this.impactScore = config.impactScore || 1;
    this.pageTypes = config.pageTypes || [];
    this.isDomainLevel = config.isDomainLevel || false;
  }
  
  /**
   * Evaluate the rule against page content
   * @param {string} url - The page URL
   * @param {Object} content - The page content object
   * @returns {Object} Rule result
   */
  async evaluate(url, content) {
    throw new Error('evaluate() must be implemented by subclass');
  }
  
  /**
   * Create a standard rule result
   * @param {number} score - The score (0-100)
   * @param {Array} evidence - Evidence items
   * @param {Array} issues - Issues found
   * @param {Object} metadata - Additional metadata
   * @param {Array} recommendations - Recommendations
   * @returns {Object} Rule result
   */
  createResult(score, evidence = [], issues = [], metadata = {}, recommendations = []) {
    // Calculate weight based on impact score
    const weight = this.impactScore;
    
    // Calculate contribution (weighted score)
    const contribution = (score * weight) / 100;
    
    return {
      ruleId: this.id,
      ruleName: this.name,
      dimension: this.dimension,
      score: Math.max(0, Math.min(100, score)), // Ensure 0-100 range
      maxScore: 100,
      weight,
      contribution,
      evidence,
      issues: issues.map(issue => ({
        ruleId: this.id,
        dimension: this.dimension,
        ...issue
      })),
      metadata,
      recommendations
    };
  }
  
  /**
   * Helper to create an issue object
   * @param {string} severity - Issue severity (critical, high, medium, low)
   * @param {string} description - Issue description
   * @param {string} recommendation - How to fix the issue
   * @param {Array} affectedElements - Optional affected elements
   * @returns {Object} Issue object
   */
  createIssue(severity, description, recommendation, affectedElements = []) {
    return {
      severity,
      description,
      recommendation,
      affectedElements,
      ruleId: this.id,
      ruleName: this.name
    };
  }
}

/**
 * Evidence helper for consistent evidence formatting
 */
class EvidenceHelper {
  static base(score) {
    return {
      type: 'base',
      topic: 'Base Score',
      message: `Starting with base score of ${score}`,
      score
    };
  }
  
  static success(topic, message, data = {}) {
    return {
      type: 'success',
      topic,
      message,
      ...data
    };
  }
  
  static warning(topic, message, data = {}) {
    return {
      type: 'warning',
      topic,
      message,
      ...data
    };
  }
  
  static error(topic, message, data = {}) {
    return {
      type: 'error',
      topic,
      message,
      ...data
    };
  }
  
  static info(topic, message, data = {}) {
    return {
      type: 'info',
      topic,
      message,
      ...data
    };
  }
  
  static scoreCalculation(breakdown, finalScore, maxScore) {
    return [
      {
        type: 'calculation',
        topic: 'Score Calculation',
        message: 'Score breakdown:',
        breakdown
      },
      {
        type: 'final',
        topic: 'Final Score',
        message: `Final score: ${finalScore}/${maxScore}`,
        score: finalScore
      }
    ];
  }
}

module.exports = {
  BaseRule,
  EvidenceHelper
};