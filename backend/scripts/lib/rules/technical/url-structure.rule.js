const { BaseRule, EvidenceHelper } = require('../base-rule');
const { URL } = require('url');

// Schema for LLM structured output
const UrlEvaluationSchema = {
  type: 'object',
  properties: {
    descriptive: {
      type: 'object',
      properties: {
        isDescriptive: { type: 'boolean' },
        reason: { type: 'string' }
      },
      required: ['isDescriptive', 'reason']
    },
    keywordOptimized: {
      type: 'object',
      properties: {
        isOptimized: { type: 'boolean' },
        reason: { type: 'string' }
      },
      required: ['isOptimized', 'reason']
    },
    hierarchy: {
      type: 'object',
      properties: {
        isGood: { type: 'boolean' },
        reason: { type: 'string' }
      },
      required: ['isGood', 'reason']
    }
  },
  required: ['descriptive', 'keywordOptimized', 'hierarchy']
};

class UrlStructureRule extends BaseRule {
  constructor(llmClients = {}) {
    super(
      'url_structure',
      'URL Structure',
      'technical',
      {
        impactScore: 2, // Medium-high impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
    this.llmClients = llmClients;
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 100;
    const scoreBreakdown = [
      { component: 'Base score', points: 100 }
    ];

    evidence.push(EvidenceHelper.base(100));

    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      
      // Check URL length
      if (url.length > 200) {
        score -= 20;
        scoreBreakdown.push({ component: 'URL too long', points: -20 });
        evidence.push(EvidenceHelper.warning('Length', `URL is ${url.length} characters (recommended < 200)`));
        issues.push(this.createIssue(
          'medium',
          'URL is too long',
          'Keep URLs under 200 characters for better usability'
        ));
      } else if (url.length > 100) {
        score -= 10;
        scoreBreakdown.push({ component: 'URL somewhat long', points: -10 });
        evidence.push(EvidenceHelper.info('Length', `URL is ${url.length} characters`));
      } else {
        evidence.push(EvidenceHelper.success('Length', `URL length is good (${url.length} characters)`));
      }

      // Check for keyword stuffing in URL
      const pathSegments = pathname.split('/').filter(s => s.length > 0);
      const keywordPattern = /^(.+)-\1-\1|(.+)_\2_\2/;
      const stuffedSegments = pathSegments.filter(segment => keywordPattern.test(segment));
      
      if (stuffedSegments.length > 0) {
        score -= 15;
        scoreBreakdown.push({ component: 'Keyword stuffing', points: -15 });
        evidence.push(EvidenceHelper.warning('Keywords', 'Possible keyword stuffing detected in URL'));
        issues.push(this.createIssue(
          'medium',
          'URL appears to have keyword stuffing',
          'Use natural, descriptive URLs without repetition'
        ));
      }

      // Check for special characters
      const specialChars = pathname.match(/[^a-zA-Z0-9\-_\/\.]/g);
      if (specialChars && specialChars.length > 0) {
        score -= 15;
        scoreBreakdown.push({ component: 'Special characters', points: -15 });
        evidence.push(EvidenceHelper.warning('Characters', `Found special characters: ${[...new Set(specialChars)].join(', ')}`));
        issues.push(this.createIssue(
          'medium',
          'URL contains special characters',
          'Use only letters, numbers, hyphens, and underscores in URLs'
        ));
      }

      // Check for excessive parameters
      const paramCount = parsedUrl.searchParams.toString().split('&').filter(p => p).length;
      if (paramCount > 3) {
        score -= 10;
        scoreBreakdown.push({ component: 'Too many parameters', points: -10 });
        evidence.push(EvidenceHelper.warning('Parameters', `URL has ${paramCount} parameters`));
        issues.push(this.createIssue(
          'low',
          'URL has many parameters',
          'Consider using cleaner URLs with fewer parameters'
        ));
      } else if (paramCount > 0) {
        evidence.push(EvidenceHelper.info('Parameters', `URL has ${paramCount} parameter(s)`));
      }

      // Check URL depth
      const depth = pathSegments.length;
      if (depth > 5) {
        score -= 10;
        scoreBreakdown.push({ component: 'Deep nesting', points: -10 });
        evidence.push(EvidenceHelper.warning('Depth', `URL is ${depth} levels deep`));
        issues.push(this.createIssue(
          'low',
          'URL structure is deeply nested',
          'Keep URL structure shallow (3-4 levels max)'
        ));
      } else {
        evidence.push(EvidenceHelper.success('Depth', `URL depth is good (${depth} levels)`));
      }

      // Check for uppercase letters
      if (pathname !== pathname.toLowerCase()) {
        score -= 10;
        scoreBreakdown.push({ component: 'Mixed case', points: -10 });
        evidence.push(EvidenceHelper.warning('Case', 'URL contains uppercase letters'));
        issues.push(this.createIssue(
          'medium',
          'URL contains uppercase letters',
          'Use lowercase URLs for consistency'
        ));
      }

      // Check for file extensions
      const hasHtmlExtension = pathname.endsWith('.html') || pathname.endsWith('.htm');
      if (hasHtmlExtension) {
        score -= 5;
        scoreBreakdown.push({ component: 'HTML extension', points: -5 });
        evidence.push(EvidenceHelper.info('Extension', 'URL includes .html extension'));
        recommendations.push('Consider removing .html extensions for cleaner URLs');
      }

      // Use LLM to evaluate URL structure intelligently if available
      if (this.hasLLMSupport()) {
        try {
          const urlEvaluation = await this.evaluateUrlWithLLM(url, pathname);

          // Apply descriptive evaluation
          if (urlEvaluation.descriptive.isDescriptive) {
            evidence.push(EvidenceHelper.success('Structure', 'URL uses descriptive, readable words', {
              target: 'Descriptive URLs improve user experience and SEO'
            }));
          } else {
            score -= 15;
            scoreBreakdown.push({ component: 'Non-descriptive URL', points: -15 });
            evidence.push(EvidenceHelper.warning('Structure', urlEvaluation.descriptive.reason));
            issues.push(this.createIssue(
              'medium',
              'URL is not descriptive',
              'Use descriptive words instead of product codes or IDs'
            ));
          }

          // Apply keyword optimization evaluation
          if (urlEvaluation.keywordOptimized.isOptimized) {
            evidence.push(EvidenceHelper.success('Keywords', 'URL appears keyword-optimized', {
              target: 'Keyword-optimized URLs improve search visibility'
            }));
          } else {
            evidence.push(EvidenceHelper.warning('Keywords', urlEvaluation.keywordOptimized.reason));
            recommendations.push(urlEvaluation.keywordOptimized.reason);
            issues.push(this.createIssue(
              'medium',
              'URL contains product codes or generic terms',
              urlEvaluation.keywordOptimized.reason
            ));
          }

          // Apply hierarchy evaluation
          if (urlEvaluation.hierarchy.isGood) {
            evidence.push(EvidenceHelper.success('Hierarchy', 'Clear URL hierarchy/structure', {
              target: 'URL depth ≤ 5 levels and segments follow logical parent-child relationship'
            }));
          } else {
            score -= 10;
            scoreBreakdown.push({ component: 'Poor URL hierarchy', points: -10 });
            evidence.push(EvidenceHelper.warning('Hierarchy', urlEvaluation.hierarchy.reason));
            issues.push(this.createIssue(
              'medium',
              'Poor URL hierarchy',
              urlEvaluation.hierarchy.reason
            ));
          }
        } catch (error) {
          // Fallback to manual evaluation if LLM fails
          console.warn(`LLM evaluation failed: ${error.message}`);
          score = this.applyManualEvaluation(pathname, score, scoreBreakdown, evidence, issues, recommendations);
        }
      } else {
        // Fallback to manual evaluation when no LLM available
        score = this.applyManualEvaluation(pathname, score, scoreBreakdown, evidence, issues, recommendations);
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('URL', `Error analyzing URL structure: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }

  isDescriptiveUrl(path) {
    // Remove leading/trailing slashes and split
    const segments = path.replace(/^\/|\/$/g, '').split('/');

    if (segments.length === 0) return true; // Root path is fine

    // Check if segments contain actual descriptive words (not just codes/numbers)
    const descriptiveCount = segments.filter(segment => {
      // Skip segments that are clearly product codes or IDs
      if (/^[0-9-]+$/.test(segment)) return false; // Pure number sequences like "24-0-0-18so3"
      if (/^p\d+$/.test(segment)) return false; // Product IDs like "p211171"
      if (/^\d+$/.test(segment)) return false; // Pure numbers
      if (segment.length < 3) return false; // Too short to be descriptive
      
      // Check for mix of letters (suggests actual words)
      const hasLetters = /[a-zA-Z]/.test(segment);
      const letterCount = (segment.match(/[a-zA-Z]/g) || []).length;
      const totalLength = segment.length;
      
      // Must have at least 60% letters to be considered descriptive
      return hasLetters && (letterCount / totalLength) >= 0.6;
    }).length;

    // At least 50% of segments should be descriptive for the URL to be considered descriptive
    return descriptiveCount >= Math.ceil(segments.length * 0.5);
  }

  checkKeywordOptimization(path) {
    const segments = path.toLowerCase().replace(/^\/|\/$/g, '').split('/');

    // Skip root path
    if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
      return { optimized: true, suggestion: '' };
    }

    // Check for meaningless segments (product codes, IDs, etc.)
    const meaninglessSegments = segments.filter(segment => {
      // Product codes like "24-0-0-18so3"
      if (/^[0-9-]+$/.test(segment)) return true;
      // Product IDs like "p211171"
      if (/^p\d+$/.test(segment)) return true;
      // Pure numbers
      if (/^\d+$/.test(segment)) return true;
      // Random character sequences
      if (segment.length > 8 && !/[aeiou]/.test(segment)) return true;
      return false;
    });

    if (meaninglessSegments.length > 0) {
      return {
        optimized: false,
        suggestion: 'Replace product codes and IDs with descriptive keywords that users would search for',
        hasGenericTerms: true
      };
    }

    // Check for keyword stuffing
    const wordCounts = new Map();
    segments.forEach(segment => {
      const words = segment.split('-');
      words.forEach(word => {
        if (word.length > 2) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    const hasKeywordStuffing = Array.from(wordCounts.values()).some(count => count > 2);
    if (hasKeywordStuffing) {
      return {
        optimized: false,
        suggestion: 'Avoid keyword repetition in URL structure',
        hasKeywordStuffing: true
      };
    }

    // Check if URL is too generic
    const genericTerms = ['page', 'post', 'item', 'content', 'view', 'detail', 'info'];
    const hasGenericTerms = segments.some(segment =>
      genericTerms.some(term => segment === term)
    );

    if (hasGenericTerms) {
      return {
        optimized: false,
        suggestion: 'Replace generic terms with descriptive keywords',
        hasGenericTerms: true
      };
    }

    // Check if URL contains meaningful keywords (at least some words with vowels)
    const meaningfulSegments = segments.filter(segment => {
      const words = segment.split('-');
      return words.some(word => word.length > 3 && /[aeiou]/.test(word));
    });

    if (meaningfulSegments.length === 0) {
      return {
        optimized: false,
        suggestion: 'Add descriptive keywords that users would search for',
        hasGenericTerms: true
      };
    }

    return { optimized: true, suggestion: '' };
  }

  checkUrlHierarchy(path) {
    const segments = path.replace(/^\/|\/$/g, '').split('/').filter(s => s.length > 0);

    // Check depth
    if (segments.length > 5) {
      return {
        isGood: false,
        issue: `URL hierarchy too deep (${segments.length} levels) - aim for 3-4 levels max`,
        isTooDeep: true
      };
    }

    // Check for logical hierarchy
    if (segments.length > 1) {
      // Check if segments get more specific (longer) as we go deeper
      let previousLength = segments[0].length;
      let getsMoreSpecific = true;

      for (let i = 1; i < segments.length; i++) {
        if (segments[i].length < previousLength * 0.5) {
          getsMoreSpecific = false;
          break;
        }
      }

      if (!getsMoreSpecific && segments.length > 2) {
        return {
          isGood: false,
          issue: 'URL hierarchy seems illogical - ensure parent-child relationship'
        };
      }
    }

    return { isGood: true };
  }

  hasLLMSupport() {
    return this.llmClients && (this.llmClients.openai || this.llmClients.anthropic || this.llmClients.google);
  }

  async evaluateUrlWithLLM(url, path) {
    const prompt = `Analyze this URL for SEO and user experience quality:

URL: ${url}
Path: ${path}

Evaluate the following 3 aspects:

1. DESCRIPTIVE: Does the URL use descriptive, readable words instead of product codes, IDs, or meaningless characters?
   - URLs like "/products/wireless-headphones" are descriptive
   - URLs like "/24-0-0-18so3/p211171" or "/abc123/xyz456" are NOT descriptive

2. KEYWORD_OPTIMIZED: Does the URL contain meaningful keywords that users would search for?
   - Avoid product codes, generic terms like "page/item/content", or keyword stuffing
   - Should contain relevant keywords for the content

3. HIERARCHY: Does the URL have a logical, clear hierarchy that makes sense?
   - Should not be too deep (5+ levels)
   - Should follow a logical parent-child relationship
   - Should be well-structured

Respond with valid JSON in this exact format:
{
  "descriptive": {
    "isDescriptive": true/false,
    "reason": "brief explanation"
  },
  "keywordOptimized": {
    "isOptimized": true/false,
    "reason": "brief explanation"
  },
  "hierarchy": {
    "isGood": true/false,
    "reason": "brief explanation"
  }
}`;

    // Try providers in order
    const providers = [
      { client: 'openai', model: 'gpt-4o-mini' },
      { client: 'anthropic', model: 'claude-3-haiku-20240307' },
      { client: 'google', model: 'gemini-1.5-flash' }
    ];

    for (const { client, model } of providers) {
      if (this.llmClients[client]) {
        try {
          const response = await this.callLLMProvider(client, model, prompt);
          if (response) {
            return this.parseJSONResponse(response);
          }
        } catch (error) {
          console.warn(`Failed to call ${client}:`, error.message);
        }
      }
    }

    throw new Error('All LLM providers failed');
  }

  async callLLMProvider(provider, model, prompt) {
    switch (provider) {
      case 'openai':
        const openaiResponse = await this.llmClients.openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are an SEO expert evaluating URL structure quality. Be strict in your evaluation - only return true for genuinely good URLs. Respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: "json_object" }
        });
        return openaiResponse.choices[0].message.content;

      case 'anthropic':
        const anthropicResponse = await this.llmClients.anthropic.messages.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.1,
          system: 'You are an SEO expert evaluating URL structure quality. Be strict in your evaluation - only return true for genuinely good URLs. Respond with valid JSON only.'
        });
        return anthropicResponse.content[0].text;

      case 'google':
        const googleResponse = await this.llmClients.google.invoke([
          { type: 'system', content: 'You are an SEO expert evaluating URL structure quality. Be strict in your evaluation - only return true for genuinely good URLs. Respond with valid JSON only.' },
          { type: 'human', content: prompt }
        ]);
        return googleResponse.content;

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  parseJSONResponse(response) {
    try {
      const parsed = JSON.parse(response);
      
      // Validate structure matches our schema
      if (parsed.descriptive && parsed.keywordOptimized && parsed.hierarchy) {
        return parsed;
      } else {
        throw new Error('Response missing required fields');
      }
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      // Return a default analysis
      return {
        descriptive: {
          isDescriptive: false,
          reason: 'Failed to parse LLM analysis - assuming non-descriptive'
        },
        keywordOptimized: {
          isOptimized: false,
          reason: 'Failed to parse LLM analysis - assuming not optimized'
        },
        hierarchy: {
          isGood: true,
          reason: 'Failed to parse LLM analysis - assuming hierarchy is acceptable'
        }
      };
    }
  }

  applyManualEvaluation(pathname, score, scoreBreakdown, evidence, issues, recommendations) {
    // Check for descriptive URLs (fallback logic)
    if (this.isDescriptiveUrl(pathname)) {
      const segments = pathname.replace(/^\/|\/$/g, '').split('/');
      const descriptiveWords = segments.flatMap(segment => 
        segment.split('-').filter(word => word.length > 2)
      );
      
      evidence.push(EvidenceHelper.success('Structure', 'URL uses descriptive, readable words', {
        details: descriptiveWords.slice(0, 8).join(', ') + (descriptiveWords.length > 8 ? '...' : ''),
        target: 'Descriptive URLs improve user experience and SEO'
      }));
    } else {
      score -= 15;
      scoreBreakdown.push({ component: 'Non-descriptive URL', points: -15 });
      evidence.push(EvidenceHelper.warning('Structure', 'URL could be more descriptive'));
      issues.push(this.createIssue(
        'medium',
        'URL is not descriptive',
        'Use descriptive words instead of product codes or IDs'
      ));
    }

    // Check for keyword optimization (fallback logic)
    const keywordOptimization = this.checkKeywordOptimization(pathname);
    if (keywordOptimization.optimized) {
      evidence.push(EvidenceHelper.success('Keywords', 'URL appears keyword-optimized', {
        target: 'Keyword-optimized URLs improve search visibility'
      }));
    } else {
      evidence.push(EvidenceHelper.warning('Keywords', 'URL could be more keyword-optimized'));
      if (keywordOptimization.suggestion) {
        recommendations.push(keywordOptimization.suggestion);
        if (keywordOptimization.hasGenericTerms) {
          issues.push(this.createIssue(
            'medium',
            'URL contains product codes or generic terms',
            keywordOptimization.suggestion
          ));
        }
      }
    }

    // Check URL hierarchy (fallback logic)
    const hierarchyCheck = this.checkUrlHierarchy(pathname);
    if (hierarchyCheck.isGood) {
      evidence.push(EvidenceHelper.success('Hierarchy', 'Clear URL hierarchy/structure', {
        target: 'URL depth ≤ 5 levels and segments follow logical parent-child relationship'
      }));
    } else {
      score -= 10;
      scoreBreakdown.push({ component: 'Poor URL hierarchy', points: -10 });
      evidence.push(EvidenceHelper.warning('Hierarchy', hierarchyCheck.issue));
      issues.push(this.createIssue(
        'medium',
        'Poor URL hierarchy',
        hierarchyCheck.issue
      ));
    }
    
    return score;
  }
}

module.exports = UrlStructureRule;