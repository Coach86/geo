const { BaseRule } = require('../base-rule');
const { z } = require('zod');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { PageCategoryType } = require('../../page-category-types');

// Zod schema for structured output
const ComparisonItemSchema = z.object({
  name: z.string().describe('The name of the product/service/solution being compared'),
  category: z.string().describe('The category or type (e.g., "competitor", "alternative solution", "internal product")'),
  excerpt: z.string().describe('A direct quote from the content (50-150 chars) showing how this item is described or compared'),
  prosFound: z.array(z.string()).describe('List of advantages/pros/benefits mentioned for this item'),
  consFound: z.array(z.string()).describe('List of disadvantages/cons/drawbacks mentioned for this item'),
  keyFeatures: z.array(z.string()).describe('Key features or characteristics highlighted')
});

const ComparisonAnalysisSchema = z.object({
  comparisonItems: z.array(ComparisonItemSchema).describe('All items being compared in the content'),
  hasComparisonTable: z.boolean().describe('Whether the page contains a structured comparison table'),
  hasProsCons: z.boolean().describe('Whether the page uses pros/cons lists'),
  hasBulletedLists: z.boolean().describe('Whether comparisons use bullet points or numbered lists'),
  comparisonDepth: z.enum(['surface', 'moderate', 'detailed']).describe('How thorough the comparison is'),
  fairnessLevel: z.enum(['biased', 'somewhat_fair', 'balanced']).describe('How balanced/fair the comparison appears'),
  hasItemListSchema: z.boolean().describe('Whether ItemList or Product schema markup is detected'),
  hasInternalLinks: z.boolean().describe('Whether there are internal links to alternatives'),
  lastUpdated: z.string().nullable().optional().describe('When the comparison was last updated if mentioned'),
  analysis: z.string().describe('Overall assessment of the comparison quality')
});

class ComparisonContentLLMRule extends BaseRule {
  constructor(llmClients = {}) {
    super();
    this.id = 'comparison-content';
    this.name = 'Comparison Content';
    this.description = 'Evaluates quality and structure of comparison content (vs, alternatives)';
    this.dimension = 'authority';
    this.weight = 1.5;
    this.pageTypes = [
      PageCategoryType.COMPARISON_PAGE,
      PageCategoryType.BLOG_POST_ARTICLE,
      PageCategoryType.PRODUCT_DETAIL_PAGE,
      PageCategoryType.PRODUCT_ROUNDUP_REVIEW_ARTICLE
    ];
    this.llmClients = llmClients;
    
    // Scoring thresholds
    this.MIN_COMPARISON_ITEMS_EXCELLENT = 2;
    this.MIN_COMPARISON_ITEMS_GOOD = 2;
    this.MIN_COMPARISON_ITEMS_MODERATE = 1;
    
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
  
  isComparisonUrl(url) {
    return /(?:vs|versus|compare|comparison|difference|alternative)/i.test(url);
  }
  
  async evaluate(pageContent, options = {}) {
    const issues = [];
    const recommendations = [];
    const evidence = [];
    let score = 0;
    let llmUsed = false;
    
    const url = pageContent.url;
    const $ = pageContent.$;
    const html = pageContent.html || '';
    const cleanText = $('body').text() || '';
    
    // Quick check if this is likely a comparison page
    const isComparisonPage = this.isComparisonUrl(url);
    if (isComparisonPage) {
      evidence.push('✓ URL indicates comparison content');
    }
    
    // Prepare content for LLM analysis
    const contentForAnalysis = cleanText.substring(0, this.MAX_CONTENT_LENGTH);
    
    // Validate content
    if (!contentForAnalysis || contentForAnalysis.trim().length < this.MIN_CONTENT_LENGTH) {
      issues.push({
        dimension: 'authority',
        severity: 'error',
        description: 'Insufficient content to analyze for comparisons',
        recommendation: 'Add substantial comparison content'
      });
      return this.createResult(this.SCORE_NOT_PRESENT, evidence, issues, {}, recommendations);
    }
    
    // Check LLM availability
    if (!this.llmClients || Object.keys(this.llmClients).length === 0) {
      evidence.push('⚠ No LLM available, using basic heuristics');
      
      // Basic heuristic analysis
      const comparisonPatterns = [
        /\bvs\b|\bversus\b/gi,
        /compar(?:e|ed|ing|ison)/gi,
        /alternative(?:s)? to/gi,
        /better than|worse than/gi,
        /pros?\s*(?:and|&)\s*cons?/gi,
        /advantage|disadvantage/gi
      ];
      
      let patternMatches = 0;
      let hasStructure = false;
      
      comparisonPatterns.forEach((pattern, index) => {
        const matches = contentForAnalysis.match(pattern);
        if (matches) {
          patternMatches += matches.length;
          if (index === 4) hasStructure = true; // Pros/cons pattern
        }
      });
      
      // Check for table structure
      if (/<table/i.test(html) && patternMatches > 0) {
        hasStructure = true;
      }
      
      if (patternMatches >= 5 && hasStructure) {
        score = this.SCORE_GOOD;
        evidence.push(`✓ Found ${patternMatches} comparison patterns with structure`);
      } else if (patternMatches >= 3) {
        score = this.SCORE_MODERATE;
        evidence.push(`○ Found ${patternMatches} comparison patterns`);
        recommendations.push('Add structured format (table, pros/cons lists)');
      } else if (patternMatches >= 1) {
        score = this.SCORE_POOR;
        evidence.push(`○ Limited comparison patterns found`);
        recommendations.push('Expand comparison with multiple items and criteria');
      } else {
        score = this.SCORE_NOT_PRESENT;
        evidence.push('✗ No comparison content found');
        issues.push({
          dimension: 'authority',
          severity: 'error',
          description: 'No comparison content found',
          recommendation: 'Add comparison content to help users evaluate alternatives'
        });
      }
      
      return this.createResult(score, evidence, issues, {}, recommendations);
    }
    
    // LLM Analysis
    const prompt = `Analyze the provided website content to identify and evaluate comparison content.

IMPORTANT DEFINITIONS:
- Comparison Content: Content that directly compares products, services, or solutions (using "vs", "versus", "compare", "alternative to")
- NOT Comparison: General feature lists, single product descriptions, or mentions without actual comparison

EVALUATION CRITERIA:
1. **Comparison Structure**:
   - TABLE: Structured comparison table with rows/columns
   - PROS/CONS: Clear lists of advantages and disadvantages
   - BULLETED: Bullet points or numbered lists comparing features
   - NARRATIVE: Text-based comparison without structure

2. **Comparison Depth**:
   - DETAILED: Comprehensive comparison with multiple criteria, metrics, use cases
   - MODERATE: Covers main features and differences
   - SURFACE: Basic comparison with limited criteria

3. **Fairness Level**:
   - BALANCED: Fair presentation of strengths/weaknesses for all items
   - SOMEWHAT_FAIR: Mostly fair with slight bias
   - BIASED: Heavily favors one option

IMPORTANT: For each comparison item found, you MUST provide:
- An exact excerpt showing how it's described in the content
- List specific pros and cons mentioned
- Key features or characteristics highlighted

Analyze for:
1. Products/services being compared
2. Comparison tables or structured formats
3. Pros/cons lists
4. Internal links to alternatives
5. Schema markup (ItemList, Product)
6. Update dates or freshness indicators

URL: ${url}

Website Content:
${contentForAnalysis}

HTML (for structure detection):
${html.substring(0, 5000)}

Analyze for comparisons and return structured data according to the schema.`;
    
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
            temperature: 0.3,
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
            temperature: 0.3,
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
            temperature: 0.3,
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
          llmResponse = await chatModel.withStructuredOutput(ComparisonAnalysisSchema).invoke(messages);
          successfulProvider = name;
          llmUsed = true;
          break;
        } catch (error) {
          console.warn(`Failed to use ${name} for comparison analysis:`, error.message);
          continue;
        }
      }
      
      if (!llmResponse) {
        throw new Error('All LLM providers failed');
      }
      
      // Process results
      const itemCount = llmResponse.comparisonItems.length;
      const hasStructure = llmResponse.hasComparisonTable || llmResponse.hasProsCons || llmResponse.hasBulletedLists;
      const hasAdvancedFeatures = llmResponse.hasItemListSchema && llmResponse.hasInternalLinks;
      
      // Score based on quality
      if (itemCount >= 2) {
        if (hasAdvancedFeatures && llmResponse.hasComparisonTable) {
          score = this.SCORE_EXCELLENT;
          evidence.push('✓ Excellent comparison page with table, schema markup, and internal links');
        } else if (hasStructure) {
          score = this.SCORE_GOOD;
          evidence.push(`✓ Well-structured comparison with ${hasStructure ? 'organized format' : 'narrative'}`);
          
          // Add what's missing for excellent score
          const missingFeatures = [];
          if (!llmResponse.hasComparisonTable) missingFeatures.push('comparison table');
          if (!llmResponse.hasItemListSchema) missingFeatures.push('schema markup');
          if (!llmResponse.hasInternalLinks) missingFeatures.push('internal links');
          if (missingFeatures.length > 0) {
            recommendations.push(`Add ${missingFeatures.join(', ')} to achieve excellent score`);
          }
        } else {
          score = this.SCORE_MODERATE;
          evidence.push('○ Comparison content present but lacks structured format');
          issues.push({
            dimension: 'authority',
            severity: 'warning',
            description: 'Comparison lacks structured format',
            recommendation: 'Add table, pros/cons lists, or bullet points for better readability'
          });
        }
      } else if (itemCount === 1) {
        score = this.SCORE_POOR;
        evidence.push('○ Limited comparison - only one item analyzed');
        issues.push({
          dimension: 'authority',
          severity: 'warning',
          description: 'Comparison only covers one item',
          recommendation: 'Compare at least 2 items for proper comparison'
        });
      } else {
        score = this.SCORE_NOT_PRESENT;
        evidence.push('✗ No clear comparison content found');
        issues.push({
          dimension: 'authority',
          severity: 'error',
          description: 'No comparison content found',
          recommendation: 'Add comparison content with 2+ items'
        });
      }
      
      // Structure assessment
      if (llmResponse.hasComparisonTable) {
        evidence.push('✓ Contains comparison table for easy scanning');
      }
      if (llmResponse.hasProsCons) {
        evidence.push('✓ Uses pros/cons lists for clarity');
      }
      if (llmResponse.hasBulletedLists) {
        evidence.push('✓ Features bulleted lists for readability');
      }
      
      // Fairness assessment
      evidence.push(`Comparison fairness: ${llmResponse.fairnessLevel.replace('_', ' ')}`);
      if (llmResponse.fairnessLevel === 'biased') {
        score = Math.max(this.SCORE_POOR, score - 20);
        evidence.push('⚠ Comparison appears heavily biased (-20 points)');
        recommendations.push('Present a more balanced view of all options');
      }
      
      // Depth assessment
      evidence.push(`Comparison depth: ${llmResponse.comparisonDepth}`);
      
      // Technical features
      if (llmResponse.hasItemListSchema) {
        evidence.push('✓ Uses ItemList/Product schema markup');
      } else {
        recommendations.push('Add ItemList schema markup for better search visibility');
      }
      
      if (llmResponse.hasInternalLinks) {
        evidence.push('✓ Includes internal links to alternatives');
      } else {
        recommendations.push('Add internal links to each alternative');
      }
      
      // List items being compared
      if (itemCount > 0) {
        evidence.push('Items being compared:');
        llmResponse.comparisonItems.forEach((item, index) => {
          evidence.push(`  ${index + 1}. ${item.name} (${item.category})`);
          if (item.excerpt) {
            evidence.push(`     "${item.excerpt}"`);
          }
          if (item.prosFound.length > 0) {
            evidence.push(`     Pros: ${item.prosFound.slice(0, 2).join(', ')}${item.prosFound.length > 2 ? '...' : ''}`);
          }
          if (item.consFound.length > 0) {
            evidence.push(`     Cons: ${item.consFound.slice(0, 2).join(', ')}${item.consFound.length > 2 ? '...' : ''}`);
          }
        });
      }
      
      evidence.push(`✓ LLM analysis completed (${successfulProvider})`);
      
    } catch (error) {
      console.error('LLM analysis failed:', error);
      evidence.push('⚠ LLM analysis failed, using fallback heuristics');
      
      // Fallback to basic heuristics
      const hasPatterns = /\bvs\b|versus|compar|alternative/gi.test(contentForAnalysis);
      const hasTable = /<table/i.test(html);
      
      if (hasPatterns && hasTable) {
        score = this.SCORE_MODERATE;
        evidence.push('Found comparison patterns with table structure');
      } else if (hasPatterns) {
        score = this.SCORE_POOR;
        evidence.push('Found comparison patterns but no structure');
        recommendations.push('Add structured format for comparisons');
      } else {
        score = this.SCORE_NOT_PRESENT;
        issues.push({
          dimension: 'authority',
          severity: 'error',
          description: 'Unable to analyze comparison content',
          recommendation: 'Ensure comparison content is present and clear'
        });
      }
    }
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }
}

module.exports = ComparisonContentLLMRule;