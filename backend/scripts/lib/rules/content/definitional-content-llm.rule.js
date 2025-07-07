const { BaseRule } = require('../base-rule');
const { z } = require('zod');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { PageCategoryType } = require('../../page-category-types');

// Zod schema for structured output
const DefinitionSchema = z.object({
  term: z.string().describe('The term or concept being defined'),
  definition: z.string().describe('The main definition provided'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) showing the definition'),
  isDirectDefinition: z.boolean().describe('Whether this is a clear, direct definition (starts with "X is..." or similar)'),
  hasExamples: z.boolean().describe('Whether examples are provided to illustrate the concept'),
  hasRelatedTerms: z.boolean().describe('Whether related terms or concepts are mentioned'),
  hasEtymology: z.boolean().describe('Whether the origin or etymology of the term is explained'),
  definitionClarity: z.enum(['clear', 'moderate', 'vague']).describe('How clear and concise the definition is'),
  definitionCompleteness: z.enum(['comprehensive', 'adequate', 'basic']).describe('How thorough the definition is')
});

const DefinitionalAnalysisSchema = z.object({
  definitions: z.array(DefinitionSchema).describe('All definitions found in the content'),
  pageType: z.enum(['dedicated_definition', 'glossary', 'mixed_content', 'non_definitional']).describe('The type of definitional content'),
  hasStructuredMarkup: z.boolean().describe('Whether the page uses definition lists (dl/dt/dd) or semantic markup'),
  hasSchemaMarkup: z.boolean().describe('Whether DefinedTerm or similar schema.org markup is present'),
  definitionDensity: z.enum(['high', 'medium', 'low', 'none']).describe('How much of the content is definitional'),
  targetAudience: z.enum(['beginner', 'intermediate', 'expert', 'mixed']).describe('The apparent target audience level'),
  analysis: z.string().describe('Overall assessment of the definitional content quality')
});

class DefinitionalContentLLMRule extends BaseRule {
  constructor(llmClients = {}) {
    super();
    this.id = 'definitional-content';
    this.name = 'What is X? Definitional Content';
    this.description = 'Evaluates presence and quality of definitional content ("What is X?" format)';
    this.dimension = 'content';
    this.weight = 1.5;
    this.pageTypes = [
      PageCategoryType.WHAT_IS_X_DEFINITIONAL_PAGE,
      PageCategoryType.FAQ_GLOSSARY_PAGES,
      PageCategoryType.BLOG_POST_ARTICLE,
      PageCategoryType.PRODUCT_DETAIL_PAGE,
      PageCategoryType.SERVICES_FEATURES_PAGE
    ];
    this.llmClients = llmClients;
    
    // Scoring thresholds
    this.MIN_DEFINITIONS_EXCELLENT = 5;
    this.MIN_DEFINITIONS_GOOD = 2;
    this.MIN_DEFINITIONS_POOR = 1;
    
    // Scoring values
    this.SCORE_EXCELLENT = 100;
    this.SCORE_GOOD = 80;
    this.SCORE_MODERATE = 60;
    this.SCORE_POOR = 40;
    this.SCORE_NOT_PRESENT = 20;
    
    // Content limits
    this.MAX_CONTENT_LENGTH = 20000;
    this.MIN_CONTENT_LENGTH = 100;
  }
  
  isDefinitionalUrl(url) {
    return /(?:what[_-]is|definition|glossary|terminology|dictionary)/i.test(url);
  }
  
  async evaluate(pageContent) {
    const issues = [];
    const recommendations = [];
    const evidence = [];
    let score = 0;
    let llmUsed = false;
    
    const { url, $ } = pageContent;
    const html = pageContent.html || '';
    const cleanText = $('body').text() || '';
    
    // Quick check if this is likely a definitional page
    const isDefinitionalPage = this.isDefinitionalUrl(url);
    if (isDefinitionalPage) {
      evidence.push('✓ URL indicates definitional content');
    }
    
    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, this.MAX_CONTENT_LENGTH);
    
    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < this.MIN_CONTENT_LENGTH) {
      issues.push({
        dimension: 'content',
        severity: 'error',
        description: 'Insufficient content to analyze for definitions',
        recommendation: 'Add substantial content defining key terms and concepts'
      });
      return { score: this.SCORE_NOT_PRESENT, issues, recommendations, evidence };
    }
    
    // Check LLM availability
    if (!this.llmClients || Object.keys(this.llmClients).length === 0) {
      evidence.push('⚠ No LLM available, using basic heuristics');
      
      // Basic heuristic analysis
      const definitionPatterns = [
        /\b(?:is|are|refers? to|means?|defined as|known as)\b/gi,
        /\bwhat (?:is|are)\b/gi,
        /\bdefinition:?\s/gi
      ];
      
      let patternMatches = 0;
      definitionPatterns.forEach(pattern => {
        const matches = contentForAnalysis.match(pattern);
        if (matches) patternMatches += matches.length;
      });
      
      if (patternMatches >= 5) {
        score = this.SCORE_GOOD;
        evidence.push(`✓ Found ${patternMatches} definition patterns`);
      } else if (patternMatches >= 2) {
        score = this.SCORE_MODERATE;
        evidence.push(`○ Found ${patternMatches} definition patterns`);
        recommendations.push('Add more clear definitions using "X is..." format');
      } else {
        score = this.SCORE_POOR;
        evidence.push(`✗ Only ${patternMatches} definition patterns found`);
        recommendations.push('Create dedicated definitional content with clear "What is X?" format');
      }
      
      return { score, issues, recommendations, evidence };
    }
    
    // LLM Analysis
    const prompt = `Analyze the provided website content to identify and evaluate definitional content.

IMPORTANT DEFINITIONS:
- Definitional Content: Content that explicitly defines terms, concepts, or industry jargon ("What is X?" format)
- Direct Definition: Clear statements like "X is...", "X refers to...", "X means..."
- NOT Definitional: General descriptions, feature lists, or mentions without actual definitions

EVALUATION CRITERIA:
1. **Definition Clarity**:
   - CLEAR: Direct, concise definition in first 1-2 sentences
   - MODERATE: Definition present but buried or verbose
   - VAGUE: Unclear or ambiguous definition

2. **Definition Completeness**:
   - COMPREHENSIVE: Includes definition, examples, related terms, context
   - ADEQUATE: Basic definition with some supporting information
   - BASIC: Minimal definition without elaboration

3. **Page Types**:
   - DEDICATED_DEFINITION: "What is X?" pages focused on defining
   - GLOSSARY: Multiple terms defined in list/dictionary format
   - MIXED_CONTENT: Definitions embedded within other content
   - NON_DEFINITIONAL: No clear definitional intent

IMPORTANT: For each definition found, you MUST provide:
- An exact excerpt showing the definition (50-150 characters)
- Whether it's a clear, direct definition
- Supporting elements (examples, etymology, related terms)

Analyze for:
1. "What is X?" patterns and direct definitions
2. Definition lists (dl/dt/dd) or glossary structures
3. Examples and illustrations
4. Related terms and cross-references
5. Schema markup (DefinedTerm, etc.)
6. Target audience level

URL: ${url}

Website Content:
${contentForAnalysis}

HTML (for structure detection):
${html.substring(0, 5000)}`;
    
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
            maxTokens: 2500
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
            maxTokens: 2500
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
            maxTokens: 2500
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
          llmResponse = await chatModel.withStructuredOutput(DefinitionalAnalysisSchema).invoke(messages);
          successfulProvider = name;
          llmUsed = true;
          break;
        } catch (error) {
          console.warn(`Failed to use ${name} for definitional analysis:`, error.message);
          continue;
        }
      }
      
      if (!llmResponse) {
        throw new Error('All LLM providers failed');
      }
      
      // Process LLM results
      const definitionCount = llmResponse.definitions.length;
      const clearDefinitions = llmResponse.definitions.filter(d => 
        d.isDirectDefinition && d.definitionClarity === 'clear'
      ).length;
      const isDedicatedPage = llmResponse.pageType === 'dedicated_definition' || 
                             llmResponse.pageType === 'glossary';
      
      // Scoring based on thresholds
      if (isDedicatedPage && clearDefinitions >= this.MIN_DEFINITIONS_EXCELLENT) {
        score = this.SCORE_EXCELLENT;
        evidence.push(`✓ Comprehensive definitional page with ${clearDefinitions} clear definitions`);
      } else if (isDedicatedPage && clearDefinitions >= this.MIN_DEFINITIONS_GOOD) {
        score = this.SCORE_GOOD;
        evidence.push(`✓ Good definitional content with ${clearDefinitions} clear definitions`);
      } else if (definitionCount >= this.MIN_DEFINITIONS_POOR) {
        score = this.SCORE_MODERATE;
        evidence.push(`○ Basic definitional content with ${definitionCount} definitions`);
        issues.push({
          dimension: 'content',
          severity: 'warning',
          description: 'Definitional content could be clearer and more comprehensive',
          recommendation: 'Improve definition clarity and add more examples'
        });
      } else if (definitionCount > 0) {
        score = this.SCORE_POOR;
        evidence.push(`✗ Limited definitional content found`);
        issues.push({
          dimension: 'content',
          severity: 'warning',
          description: 'Minimal definitional content, mostly buried in other text',
          recommendation: 'Create clear, dedicated definitions for key terms'
        });
      } else {
        score = this.SCORE_NOT_PRESENT;
        evidence.push('✗ No definitional content found');
        issues.push({
          dimension: 'content',
          severity: 'error',
          description: 'No definitional content found on the page',
          recommendation: 'Add clear definitions for industry terms and concepts'
        });
      }
      
      // Add analysis details
      evidence.push(`Page type: ${llmResponse.pageType.replace(/_/g, ' ')}`);
      evidence.push(`Definition density: ${llmResponse.definitionDensity}`);
      evidence.push(`Target audience: ${llmResponse.targetAudience}`);
      
      // Structure assessment
      if (llmResponse.hasStructuredMarkup) {
        evidence.push('✓ Uses semantic definition markup (dl/dt/dd)');
      } else {
        recommendations.push('Use definition lists (dl/dt/dd) for better structure');
      }
      
      if (llmResponse.hasSchemaMarkup) {
        evidence.push('✓ Includes DefinedTerm schema markup');
      } else {
        recommendations.push('Add DefinedTerm schema.org markup for better AI understanding');
      }
      
      // List definitions found
      if (definitionCount > 0) {
        evidence.push('Definitions found:');
        llmResponse.definitions.slice(0, 5).forEach(def => {
          const quality = def.isDirectDefinition ? '✓' : '○';
          evidence.push(`  ${quality} ${def.term} - ${def.definitionClarity}/${def.definitionCompleteness}`);
          if (def.excerpt) {
            evidence.push(`     "${def.excerpt}"`);
          }
        });
        
        if (definitionCount > 5) {
          evidence.push(`  ... and ${definitionCount - 5} more definitions`);
        }
      }
      
      // Quality insights
      const needsExamples = llmResponse.definitions.filter(d => !d.hasExamples).length;
      if (needsExamples > 0) {
        recommendations.push('Include examples to illustrate concepts');
      }
      
      const needsRelated = llmResponse.definitions.filter(d => !d.hasRelatedTerms).length;
      if (needsRelated > 0) {
        recommendations.push('Link to related terms and concepts');
      }
      
      evidence.push(`✓ LLM analysis completed (${successfulProvider})`);
      
    } catch (error) {
      console.error('LLM analysis failed:', error);
      evidence.push('⚠ LLM analysis failed, using fallback heuristics');
      
      // Fallback to basic heuristics
      const definitionPatterns = contentForAnalysis.match(/\b(?:is|are|refers? to|means?|defined as)\b/gi);
      if (definitionPatterns && definitionPatterns.length >= 3) {
        score = this.SCORE_MODERATE;
        evidence.push(`Found ${definitionPatterns.length} potential definition patterns`);
      } else {
        score = this.SCORE_POOR;
        issues.push({
          dimension: 'content',
          severity: 'error',
          description: 'Unable to analyze definitional content properly',
          recommendation: 'Ensure clear definitional content is present'
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

module.exports = DefinitionalContentLLMRule;