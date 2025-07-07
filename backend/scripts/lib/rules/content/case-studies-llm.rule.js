const { BaseRule } = require('../base-rule');
const { z } = require('zod');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { PageCategoryType } = require('../../page-category-types');

// Zod schema for structured output
const CaseStudySchema = z.object({
  description: z.string().describe('A 1-2 sentence summary of the case study INCLUDING the key metric or result if available'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) that best represents this case study, especially metrics or results'),
  keyMetric: z.string().nullable().optional().describe('The most impressive metric or result from this case study (e.g., "40% increase in revenue", "$2M saved")'),
  clientName: z.string().nullable().optional().describe('The client or company name if mentioned'),
  hasChallengeSolutionResultStructure: z.boolean().describe('Does it clearly follow a Challenge/Problem -> Solution -> Result/Outcome structure?'),
  hasQuantifiableMetrics: z.boolean().describe("Does it include specific, quantifiable data (e.g., '40% increase', 'saved $50,000', 'reduced time by 2 weeks')?"),
  hasAuthenticClientDetails: z.boolean().describe('Does it mention the client by name, include quotes, or other specific, non-generic details?'),
  sourceSection: z.string().describe('The section or URL where this case study was found')
});

const CaseStudiesAnalysisSchema = z.object({
  caseStudies: z.array(CaseStudySchema).describe('An array of all case studies found on the website'),
  analysis: z.string().describe('A brief overall summary of the findings and reasoning')
});

class CaseStudiesLLMRule extends BaseRule {
  constructor(llmClients = {}) {
    super();
    this.id = 'case-studies';
    this.name = 'Case Studies & Success Stories';
    this.description = 'Evaluates presence and quality of case studies with metrics and client details';
    this.dimension = 'content';
    this.weight = 1.5;
    this.pageTypes = [
      PageCategoryType.CASE_STUDY_SUCCESS_STORY,
      PageCategoryType.BLOG_POST_ARTICLE,
      PageCategoryType.PRODUCT_DETAIL_PAGE,
      PageCategoryType.SERVICES_FEATURES_PAGE
    ];
    this.llmClients = llmClients;
    
    // Scoring thresholds
    this.EXCELLENT_THRESHOLD = 5; // ≥5 high-quality case studies
    this.GOOD_THRESHOLD = 2;      // 2-4 case studies
    this.POOR_THRESHOLD = 1;      // 1 case study
    
    // Scoring values
    this.SCORE_EXCELLENT = 100;
    this.SCORE_GOOD = 80;
    this.SCORE_POOR = 40;
    this.SCORE_NOT_PRESENT = 0;
    
    // Quality criteria threshold
    this.MIN_QUALITY_CRITERIA = 2; // At least 2 of 3 criteria must be met
    
    // Content analysis limits
    this.MAX_CONTENT_LENGTH = 15000;
    this.MIN_CONTENT_LENGTH = 100;
  }
  
  isHighQuality(study) {
    const criteriaMet = [
      study.hasChallengeSolutionResultStructure,
      study.hasQuantifiableMetrics,
      study.hasAuthenticClientDetails,
    ].filter(Boolean).length;
    return criteriaMet >= this.MIN_QUALITY_CRITERIA;
  }
  
  async evaluate(pageContent) {
    const issues = [];
    const recommendations = [];
    const evidence = [];
    let score = 0;
    let llmUsed = false;
    
    const { url, $ } = pageContent;
    const cleanText = $('body').text() || '';
    
    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, this.MAX_CONTENT_LENGTH);
    
    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < this.MIN_CONTENT_LENGTH) {
      issues.push({
        dimension: 'content',
        severity: 'error',
        description: 'Insufficient content to analyze for case studies',
        recommendation: 'Add substantial content with detailed case studies'
      });
      return { score: this.SCORE_NOT_PRESENT, issues, recommendations, evidence };
    }
    
    // Check LLM availability
    if (!this.llmClients || Object.keys(this.llmClients).length === 0) {
      evidence.push('⚠ No LLM available, using basic heuristics');
      
      // Basic heuristic analysis
      const caseStudyPatterns = [
        /case stud(?:y|ies)/gi,
        /success stor(?:y|ies)/gi,
        /client success/gi,
        /customer story/gi,
        /\d+%\s*(?:increase|decrease|improvement|reduction|growth)/gi,
        /\$[\d,]+\s*(?:saved|generated|revenue|cost)/gi
      ];
      
      let patternMatches = 0;
      let hasMetrics = false;
      
      caseStudyPatterns.forEach((pattern, index) => {
        const matches = contentForAnalysis.match(pattern);
        if (matches) {
          patternMatches += matches.length;
          if (index >= 4) hasMetrics = true; // Last two patterns are metrics
        }
      });
      
      if (patternMatches >= 5 && hasMetrics) {
        score = this.SCORE_GOOD;
        evidence.push(`✓ Found ${patternMatches} case study indicators with metrics`);
      } else if (patternMatches >= 2) {
        score = this.SCORE_POOR;
        evidence.push(`○ Found ${patternMatches} case study indicators`);
        recommendations.push('Add more detailed case studies with quantifiable metrics');
      } else {
        score = this.SCORE_NOT_PRESENT;
        evidence.push('✗ No case studies found');
        issues.push({
          dimension: 'content',
          severity: 'error',
          description: 'No case studies or success stories found',
          recommendation: 'Add detailed case studies showing problem → solution → results'
        });
      }
      
      return { score, issues, recommendations, evidence };
    }
    
    // LLM Analysis
    const prompt = `Analyze the provided website content to identify case studies.

IMPORTANT DEFINITIONS:
- Case Study: A detailed narrative showing how a product/service solved a specific client problem
- NOT a Case Study: Generic testimonials, brief quotes, or vague success claims

EVALUATION CRITERIA:
1. **Structure**: Must have ALL three: Problem/Challenge, Solution/Approach, Result/Outcome
2. **Quantifiable Metrics**: ONLY accept specific numbers (e.g., "47% increase", "$125,000 saved", "3 hours reduced to 20 minutes")
   DO NOT accept vague terms like "significant", "improved", "better", "enhanced", "boosted"
3. **Authentic Details**: Real company names, person names with titles, or direct quotes with attribution

EDGE CASES:
- If multiple mini-cases are in one section, count each separately
- If a case study is incomplete (missing one of the three parts), mark it as NOT meeting criteria
- Industry reports or third-party studies are NOT company case studies
- Awards or certifications alone are NOT case studies

IMPORTANT: For each case study found, you MUST provide:
- An exact excerpt (direct quote) from the content that best represents the case study
- Focus excerpts on metrics, results, or key outcomes when available
- Keep excerpts between 50-150 characters

Based on your analysis of the text below, extract all true case studies you can find.
If no case studies are found, return an empty array for "caseStudies".

URL: ${url}

Website Content:
${contentForAnalysis}

Analyze for case studies and return structured data according to the schema.`;
    
    try {
      let llmResponse = null;
      let successfulProvider = null;
      
      // Try providers in order: OpenAI, Anthropic, Google
      const providers = [
        { 
          client: this.llmClients.openai, 
          name: 'openai', 
          model: 'gpt-4o-mini',
          createChat: (apiKey) => new ChatOpenAI({ 
            openAIApiKey: apiKey, 
            modelName: 'gpt-4o-mini',
            temperature: 0.2,
            maxTokens: 2000
          })
        },
        { 
          client: this.llmClients.anthropic, 
          name: 'anthropic', 
          model: 'claude-3-haiku-20240307',
          createChat: (apiKey) => new ChatAnthropic({ 
            anthropicApiKey: apiKey, 
            modelName: 'claude-3-haiku-20240307',
            temperature: 0.2,
            maxTokens: 2000
          })
        },
        { 
          client: this.llmClients.google, 
          name: 'google', 
          model: 'gemini-1.5-flash',
          createChat: (apiKey) => new ChatGoogleGenerativeAI({ 
            apiKey: apiKey, 
            modelName: 'gemini-1.5-flash',
            temperature: 0.2,
            maxTokens: 2000
          })
        }
      ];
      
      for (const { client, name, model, createChat } of providers) {
        if (!client) continue;
        
        try {
          // Get API key from client
          const apiKey = client.apiKey || client.configuration?.apiKey || client.key;
          if (!apiKey) {
            console.warn(`No API key found for ${name}`);
            continue;
          }
          
          // Create LangChain chat model
          const chatModel = createChat(apiKey);
          
          // Create messages
          const messages = [
            new SystemMessage('You are a content analysis expert. Analyze the content and return structured JSON data.'),
            new HumanMessage(prompt)
          ];
          
          // Get structured output
          llmResponse = await chatModel.withStructuredOutput(CaseStudiesAnalysisSchema).invoke(messages);
          successfulProvider = name;
          llmUsed = true;
          break;
        } catch (error) {
          console.warn(`Failed to use ${name} for case studies analysis:`, error.message);
          continue;
        }
      }
      
      if (!llmResponse) {
        throw new Error('All LLM providers failed');
      }
      
      // Process LLM results
      const highQualityCount = llmResponse.caseStudies.filter(study => 
        this.isHighQuality(study)
      ).length;
      const totalCount = llmResponse.caseStudies.length;
      
      // Apply scoring based on thresholds
      if (highQualityCount >= this.EXCELLENT_THRESHOLD) {
        score = this.SCORE_EXCELLENT;
        evidence.push(`✓ Found ${highQualityCount} high-quality case studies with detailed structure and metrics`);
      } else if (highQualityCount >= this.GOOD_THRESHOLD) {
        score = this.SCORE_GOOD;
        evidence.push(`✓ Found ${highQualityCount} case studies with good structure`);
        recommendations.push('Add more case studies to build stronger credibility (aim for 5+)');
      } else if (totalCount >= this.POOR_THRESHOLD) {
        score = this.SCORE_POOR;
        evidence.push(`○ Found ${totalCount} case studies but only ${highQualityCount} meet quality standards`);
        issues.push({
          dimension: 'content',
          severity: 'warning',
          description: 'Case studies lack detail, metrics, or client authenticity',
          recommendation: 'Improve case studies with complete structure and quantifiable results'
        });
      } else {
        score = this.SCORE_NOT_PRESENT;
        evidence.push('✗ No substantial case studies or success stories found');
        issues.push({
          dimension: 'content',
          severity: 'error',
          description: 'No case studies found to demonstrate expertise',
          recommendation: 'Add detailed case studies showing problem → solution → results'
        });
      }
      
      // Add specific details about found case studies
      llmResponse.caseStudies.forEach((study, index) => {
        const quality = this.isHighQuality(study) ? '✓' : '○';
        evidence.push(`${quality} Case Study #${index + 1}: ${study.description}`);
        
        if (study.clientName) {
          evidence.push(`  Client: ${study.clientName}`);
        }
        
        if (study.keyMetric) {
          evidence.push(`  Key Result: ${study.keyMetric}`);
        }
        
        if (study.excerpt) {
          evidence.push(`  Excerpt: "${study.excerpt}"`);
        }
        
        // Quality indicators
        const qualityIndicators = [];
        if (study.hasChallengeSolutionResultStructure) {
          qualityIndicators.push('✓ Complete structure');
        } else {
          qualityIndicators.push('✗ Incomplete structure');
        }
        
        if (study.hasQuantifiableMetrics) {
          qualityIndicators.push('✓ Has metrics');
        } else {
          qualityIndicators.push('✗ No metrics');
        }
        
        if (study.hasAuthenticClientDetails) {
          qualityIndicators.push('✓ Named client');
        } else {
          qualityIndicators.push('✗ Anonymous');
        }
        
        evidence.push(`  Quality: ${qualityIndicators.join(', ')}`);
      });
      
      // Improvement suggestions
      if (score < this.SCORE_GOOD && llmResponse.caseStudies.length > 0) {
        const needsMetrics = llmResponse.caseStudies.some(s => !s.hasQuantifiableMetrics);
        if (needsMetrics) {
          recommendations.push('Add specific metrics (e.g., "47% increase", "$125K saved")');
        }
        
        const needsStructure = llmResponse.caseStudies.some(s => !s.hasChallengeSolutionResultStructure);
        if (needsStructure) {
          recommendations.push('Use clear problem → solution → result narrative structure');
        }
        
        const needsAuthenticity = llmResponse.caseStudies.some(s => !s.hasAuthenticClientDetails);
        if (needsAuthenticity) {
          recommendations.push('Include real client names and direct quotes');
        }
      }
      
      evidence.push(`✓ LLM analysis completed (${successfulProvider})`);
      
    } catch (error) {
      console.error('LLM analysis failed:', error);
      evidence.push('⚠ LLM analysis failed, using fallback heuristics');
      
      // Fallback to basic heuristics
      const hasPatterns = /case stud|success stor|client success/gi.test(contentForAnalysis);
      const hasMetrics = /\d+%|\$[\d,]+/g.test(contentForAnalysis);
      
      if (hasPatterns && hasMetrics) {
        score = this.SCORE_POOR;
        evidence.push('Found case study patterns with some metrics');
      } else if (hasPatterns) {
        score = this.SCORE_NOT_PRESENT;
        evidence.push('Found case study mentions but no substantial content');
        issues.push({
          dimension: 'content',
          severity: 'error',
          description: 'Case study content lacks detail and metrics',
          recommendation: 'Create detailed case studies with measurable results'
        });
      } else {
        score = this.SCORE_NOT_PRESENT;
        issues.push({
          dimension: 'content',
          severity: 'error',
          description: 'No case studies found',
          recommendation: 'Add case studies to build credibility'
        });
      }
    }
    
    return {
      score,
      issues,
      recommendations,
      evidence,
      llmUsed
    };
  }
}

module.exports = CaseStudiesLLMRule;