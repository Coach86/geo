const { BaseRule } = require('../base-rule');
const { z } = require('zod');
const { PageCategoryType } = require('../../page-category-types');

// Zod schema for structured output (focused on semantic analysis)
const GuideTopicSchema = z.object({
  topic: z.string().describe('The main topic or subtopic covered'),
  depth: z.enum(['surface', 'moderate', 'comprehensive']).describe('How deeply this topic is covered'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) showing how this topic is addressed'),
  entityCoverage: z.number().min(0).max(100).describe('Percentage of required entities/concepts covered for this topic')
});

const InDepthGuideAnalysisSchema = z.object({
  topics: z.array(GuideTopicSchema).describe('Major topics and subtopics covered in the guide'),
  guideType: z.enum(['ultimate_guide', 'complete_guide', 'pillar_page', 'standard_guide', 'basic_article', 'not_guide']).describe('The type of guide content'),
  hasTableOfContents: z.boolean().describe('Whether the guide has a table of contents or navigation'),
  hasExamples: z.boolean().describe('Whether practical examples or case studies are included'),
  hasInternalLinks: z.boolean().describe('Whether it links to related content within the site'),
  hasExternalReferences: z.boolean().describe('Whether it cites external authoritative sources'),
  lastUpdated: z.string().nullable().optional().describe('When the guide was last updated if mentioned'),
  comprehensiveness: z.enum(['exhaustive', 'thorough', 'adequate', 'basic', 'insufficient']).describe('Overall depth and completeness'),
  targetAudience: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']).describe('The apparent target audience'),
  industryFocus: z.string().nullable().optional().describe('Specific industry or sector focus if applicable'),
  analysis: z.string().describe('Overall assessment of the guide quality and depth')
});

class InDepthGuidesLLMRule extends BaseRule {
  constructor(llmClients = {}) {
    super('in-depth-guides-llm', 'In-Depth Guides (LLM)', 'quality', {
      impactScore: 3,
      pageTypes: [
        PageCategoryType.IN_DEPTH_GUIDE_WHITE_PAPER,
        PageCategoryType.HOW_TO_GUIDE_TUTORIAL,
        PageCategoryType.BLOG_POST_ARTICLE,
        PageCategoryType.PILLAR_PAGE_TOPIC_HUB
      ],
      isDomainLevel: false
    });
    this.llmClients = llmClients;
    
    // Scoring thresholds (based on real implementation)
    this.MIN_WORD_COUNT_EXCELLENT = 3000;
    this.MIN_WORD_COUNT_GOOD = 2000;
    this.MIN_WORD_COUNT_BASIC = 1500;
  }

  async evaluate(pageContent, options = {}) {
    const $ = pageContent.$;
    const cleanText = this.extractCleanText($);
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    
    let score = 0;
    const issues = [];
    const recommendations = [];
    const evidence = [];
    
    // Quick check if this is likely a guide page
    const isGuidePage = this.isGuideUrl(pageContent.url);
    if (isGuidePage) {
      score += 5;
      evidence.push('URL indicates guide content (+5 points)');
    }
    
    // Word count scoring
    if (wordCount >= this.MIN_WORD_COUNT_EXCELLENT) {
      score += 30;
      evidence.push(`Comprehensive length: ${wordCount.toLocaleString()} words (+30 points)`);
    } else if (wordCount >= this.MIN_WORD_COUNT_GOOD) {
      score += 20;
      evidence.push(`Good length: ${wordCount.toLocaleString()} words (+20 points)`);
      recommendations.push('Consider expanding to 3,000+ words for comprehensive coverage');
    } else if (wordCount >= this.MIN_WORD_COUNT_BASIC) {
      score += 10;
      evidence.push(`Moderate length: ${wordCount.toLocaleString()} words (+10 points)`);
      recommendations.push('Expand content to 3,000+ words for in-depth guide status');
    } else {
      evidence.push(`Too short for in-depth guide: ${wordCount.toLocaleString()} words`);
      issues.push({
        severity: 'high',
        description: 'Content too short for in-depth guide',
        recommendation: 'Expand content to at least 1,500 words'
      });
      return this.createResult(20, evidence, issues, {}, recommendations);
    }
    
    // Structure scoring
    const h2Count = (pageContent.html.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (pageContent.html.match(/<h3[^>]*>/gi) || []).length;
    const totalHeadings = h2Count + h3Count;
    
    if (totalHeadings >= 10 && h2Count >= 3) {
      score += 15;
      evidence.push(`Well-structured: ${h2Count} main sections, ${h3Count} subsections (+15 points)`);
    } else if (totalHeadings >= 5) {
      score += 10;
      evidence.push(`Good structure: ${totalHeadings} headings (+10 points)`);
      recommendations.push('Add more headings (10+ total with 3+ H2s) for better structure');
    } else {
      score += 5;
      evidence.push(`Limited structure: ${totalHeadings} headings (+5 points)`);
      issues.push({
        severity: 'medium',
        description: 'Insufficient heading structure',
        recommendation: 'Add clear heading hierarchy with 10+ headings'
      });
    }
    
    // Media elements scoring
    const imageCount = (pageContent.html.match(/<img[^>]*>/gi) || []).length;
    const videoCount = (pageContent.html.match(/<(?:video|iframe)[^>]*>/gi) || []).length;
    const codeBlockCount = (pageContent.html.match(/<(?:code|pre)[^>]*>/gi) || []).length;
    const totalMedia = imageCount + videoCount + codeBlockCount;
    
    if (totalMedia >= 10) {
      score += 10;
      evidence.push(`Rich media: ${imageCount} images, ${videoCount} videos, ${codeBlockCount} code blocks (+10 points)`);
    } else if (totalMedia >= 5) {
      score += 5;
      evidence.push(`Good media usage: ${totalMedia} elements (+5 points)`);
      recommendations.push('Add more media elements (10+ total) for richer content');
    }
    
    // LLM Analysis (if available)
    if (this.hasLLMSupport()) {
      try {
        const llmAnalysis = await this.analyzewithLLM(pageContent.url, cleanText.substring(0, 30000), wordCount, h2Count, h3Count);
        
        // Apply LLM-based scoring adjustments
        if (llmAnalysis.hasTableOfContents) {
          score += 10;
          evidence.push('Table of contents present (+10 points)');
        } else {
          recommendations.push('Add a table of contents for better navigation');
        }
        
        if (llmAnalysis.guideType === 'ultimate_guide' || llmAnalysis.guideType === 'complete_guide') {
          score += 10;
          evidence.push(`Positioned as ${llmAnalysis.guideType.replace(/_/g, ' ')} (+10 points)`);
        } else if (llmAnalysis.guideType === 'pillar_page') {
          score += 7;
          evidence.push('Structured as pillar page (+7 points)');
        }
        
        if (llmAnalysis.hasExamples) {
          score += 5;
          evidence.push('Includes practical examples (+5 points)');
        } else {
          recommendations.push('Add practical examples or case studies');
        }
        
        if (llmAnalysis.hasInternalLinks && llmAnalysis.hasExternalReferences) {
          score += 5;
          evidence.push('Strong linking strategy (+5 points)');
        } else if (llmAnalysis.hasInternalLinks) {
          score += 3;
          evidence.push('Has internal linking (+3 points)');
          recommendations.push('Add external references to authoritative sources');
        }
        
        if (llmAnalysis.industryFocus) {
          score += 5;
          evidence.push(`Industry focus: ${llmAnalysis.industryFocus} (+5 points)`);
        }
        
        // Topic coverage analysis
        if (llmAnalysis.topics.length > 0) {
          const avgEntityCoverage = llmAnalysis.topics.reduce((sum, t) => sum + t.entityCoverage, 0) / llmAnalysis.topics.length;
          
          if (avgEntityCoverage >= 75) {
            score += 5;
            evidence.push(`Excellent topic coverage: ${Math.round(avgEntityCoverage)}% (+5 points)`);
          } else if (avgEntityCoverage < 25) {
            score -= 10;
            evidence.push(`Low topic coverage: ${Math.round(avgEntityCoverage)}% (-10 points)`);
            issues.push({
              severity: 'high',
              description: 'Insufficient topic coverage',
              recommendation: 'Expand coverage of key concepts and entities'
            });
          }
        }
        
        // Comprehensiveness penalty
        if (llmAnalysis.comprehensiveness === 'insufficient' && wordCount >= this.MIN_WORD_COUNT_GOOD) {
          score -= 10;
          evidence.push('Long content but lacks comprehensive coverage (-10 points)');
          issues.push({
            severity: 'medium',
            description: 'Content length without depth',
            recommendation: 'Increase depth and thoroughness of coverage'
          });
        }
        
      } catch (error) {
        console.warn('LLM analysis failed, using rule-based scoring only:', error.message);
        evidence.push('(LLM analysis unavailable - using rule-based scoring)');
      }
    } else {
      evidence.push('(LLM not available - using rule-based scoring only)');
    }
    
    // Ensure score is within bounds
    score = Math.min(100, Math.max(0, score));
    
    const details = {
      wordCount,
      h2Count,
      h3Count,
      totalMedia,
      isGuidePage,
      llmUsed: this.hasLLMSupport()
    };
    
    const result = this.createResult(score, evidence, issues, details, recommendations);
    result.passed = score >= 60;
    result.llmUsed = this.hasLLMSupport();
    
    return result;
  }

  isGuideUrl(url) {
    return /(?:guide|tutorial|complete|ultimate|comprehensive|definitive|pillar)/i.test(url);
  }

  extractCleanText($) {
    // Remove script and style tags
    $('script, style').remove();
    
    // Get text content
    const text = $('body').text();
    
    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  }

  hasLLMSupport() {
    return this.llmClients && (this.llmClients.openai || this.llmClients.anthropic || this.llmClients.google);
  }

  async analyzewithLLM(url, content, wordCount, h2Count, h3Count) {
    const prompt = `Analyze the provided website content for its semantic quality as an in-depth guide.

CONTEXT: This content has ${wordCount} words, ${h2Count} main sections (H2s), and ${h3Count} subsections (H3s).

FOCUS YOUR ANALYSIS ON:
1. Table of Contents: Does it have a clear TOC or navigation structure?
2. Topic Coverage: What major topics are covered and how deeply?
3. Examples & Case Studies: Are there practical examples illustrating concepts?
4. Internal/External Links: Does it link to related resources?
5. Guide Type: Is this positioned as an ultimate guide, complete guide, pillar page, etc?
6. Comprehensiveness: How thoroughly does it cover the subject matter?
7. Entity Coverage: What percentage of expected concepts/entities are covered?
8. Freshness: Any update dates or freshness indicators?

IMPORTANT DEFINITIONS:
- Ultimate/Complete Guide: Positioned as the definitive resource on a topic
- Pillar Page: Central hub content linking to related subtopics
- NOT a Guide: Short articles, news posts, or surface-level content

For each major topic, provide an excerpt showing how it's covered.

URL: ${url}

Website Content:
${content.substring(0, 2000)}...

Return a JSON object following this exact structure:
${JSON.stringify(InDepthGuideAnalysisSchema.shape, null, 2)}`;

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
            { role: 'system', content: 'You are a web page categorization expert. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });
        return openaiResponse.choices[0].message.content;

      case 'anthropic':
        const anthropicResponse = await this.llmClients.anthropic.messages.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000,
          temperature: 0.3,
          system: 'You are a web page analysis expert. Always respond with valid JSON.'
        });
        return anthropicResponse.content[0].text;

      case 'google':
        const googleResponse = await this.llmClients.google.invoke([
          { type: 'system', content: 'You are a web page analysis expert. Always respond with valid JSON.' },
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
      
      // Validate against schema
      const validated = InDepthGuideAnalysisSchema.parse(parsed);
      return validated;
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      // Return a default analysis
      return {
        topics: [],
        guideType: 'basic_article',
        hasTableOfContents: false,
        hasExamples: false,
        hasInternalLinks: false,
        hasExternalReferences: false,
        comprehensiveness: 'basic',
        targetAudience: 'all_levels',
        analysis: 'Failed to parse LLM analysis'
      };
    }
  }
}

module.exports = InDepthGuidesLLMRule;