require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const { z } = require('zod');
const { default: pLimit } = require('p-limit');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Mistral } = require('@mistralai/mistralai');

/**
 * Standalone Visibility Pipeline Testing Script
 * 
 * This script runs visibility tests without requiring the full application context.
 * It directly calls LLM APIs to test brand visibility across multiple models.
 * 
 * Enabled models (from config.json):
 * - GPT-4o (OpenAI)
 * - Gemini 2.0 Flash (Google)
 * - Claude 3.7 Sonnet (Anthropic)
 * - Perplexity Sonar Pro
 * - Mistral Medium 2025
 * - Grok 3 Latest
 * - DeepSeek Chat (temporarily disabled due to JSON parsing issues)
 * 
 * Usage:
 *   node scripts/test-visibility-standalone.js [number_of_runs] [parallel_limit] [max_companies]
 * 
 * Examples:
 *   node scripts/test-visibility-standalone.js          # 5 runs, 10 parallel, all companies
 *   node scripts/test-visibility-standalone.js 10       # 10 runs, 10 parallel, all companies
 *   node scripts/test-visibility-standalone.js 10 20    # 10 runs, 20 parallel, all companies
 *   node scripts/test-visibility-standalone.js 5 10 3   # 5 runs, 10 parallel, first 3 companies
 * 
 * Prerequisites:
 *   1. Set API keys in your .env file:
 *      OPENAI_API_KEY=your-key
 *      ANTHROPIC_API_KEY=your-key
 *      GOOGLE_API_KEY=your-key
 *      MISTRAL_API_KEY=your-key
 *      PERPLEXITY_API_KEY=your-key
 *      XAI_API_KEY=your-key (for Grok)
 *      DEEPSEEK_API_KEY=your-key
 * 
 * Output:
 *   Creates a CSV file in scripts/data/ with detailed results for each company
 */

// Configuration
const NUM_RUNS = parseInt(process.argv[2]) || 5;
const PARALLEL_LIMIT = parseInt(process.argv[3]) || 10; // Number of parallel API calls
const MAX_COMPANIES = parseInt(process.argv[4]) || 0; // 0 means process all
const INPUT_CSV = path.join(__dirname, 'data', 'Database Citations - Next 40 v2.csv');
const OUTPUT_CSV = path.join(__dirname, 'data', `visibility-results-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${NUM_RUNS}runs.csv`);

// Initialize LLM clients and model configurations
const llmClients = {};
const modelConfigs = [];

if (process.env.OPENAI_API_KEY) {
  llmClients.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  modelConfigs.push({ provider: 'openai', model: 'gpt-4o', name: 'GPT-4o' });
}

if (process.env.ANTHROPIC_API_KEY) {
  llmClients.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  modelConfigs.push(
    { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' }
  );
}

if (process.env.GOOGLE_API_KEY) {
  llmClients.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  modelConfigs.push({ provider: 'google', model: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' });
}

if (process.env.MISTRAL_API_KEY) {
  llmClients.mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  modelConfigs.push({ provider: 'mistral', model: 'mistral-medium-2505', name: 'Mistral Medium 2025' });
}

if (process.env.PERPLEXITY_API_KEY) {
  llmClients.perplexity = new OpenAI({ 
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
  });
  modelConfigs.push({ provider: 'perplexity', model: 'sonar-pro', name: 'Perplexity Sonar Pro' });
}

if (process.env.XAI_API_KEY) {
  llmClients.grok = new OpenAI({ 
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1'
  });
  modelConfigs.push({ provider: 'grok', model: 'grok-3-latest', name: 'Grok 3 Latest' });
}

// DeepSeek temporarily disabled due to JSON parsing issues
// if (process.env.DEEPSEEK_API_KEY) {
//   llmClients.deepseek = new OpenAI({ 
//     apiKey: process.env.DEEPSEEK_API_KEY,
//     baseURL: 'https://api.deepseek.com'
//   });
//   modelConfigs.push({ provider: 'deepseek', model: 'deepseek-chat', name: 'DeepSeek Chat' });
// }

// Helper function to parse CSV
async function parseCSV(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Helper function to generate brand ID
function generateBrandId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Call LLM based on provider and model
async function callLLM(provider, model, prompt, temperature = 0.7) {
  try {
    switch (provider) {
      case 'openai':
        if (!llmClients.openai) throw new Error('OpenAI client not initialized');
        // Use OpenAI's web search preview when available
        const openaiParams = {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 1000,
        };
        
        // Add web search tool for supported models
        if (model.includes('gpt-4o')) {
          try {
            // Try using the responses endpoint with web search
            const responseResult = await llmClients.openai.responses.create({
              model: model,
              input: prompt,
              temperature,
              tools: [{ type: 'web_search_preview' }]
            });
            
            // Extract text from response
            let text = '';
            if (Array.isArray(responseResult.output)) {
              for (const item of responseResult.output) {
                if (item.type === 'message' && Array.isArray(item.content)) {
                  for (const contentItem of item.content) {
                    if (contentItem.type === 'output_text' && contentItem.text) {
                      text += contentItem.text;
                    }
                  }
                }
              }
            }
            return text || responseResult.output_text || '';
          } catch (error) {
            // Fallback to regular chat completion if web search fails
            console.log(`Web search failed for ${model}, falling back to regular completion: ${error.message}`);
          }
        }
        
        const openaiResponse = await llmClients.openai.chat.completions.create(openaiParams);
        return openaiResponse.choices[0].message.content;

      case 'anthropic':
        if (!llmClients.anthropic) throw new Error('Anthropic client not initialized');
        const anthropicParams = {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 1000,
          system: "To answer the user's question, search the web when you need current information.",
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: 3
            }
          ]
        };
        
        const anthropicResponse = await llmClients.anthropic.messages.create(anthropicParams);
        
        // Extract text from all content blocks
        let fullText = '';
        for (const block of anthropicResponse.content) {
          if (block.type === 'text') {
            fullText += block.text;
          } else if (block.type === 'server_tool_use' && block.name === 'web_search') {
            const queryText = block.input && typeof block.input === 'object' && 'query' in block.input
              ? block.input.query
              : 'information';
            fullText += `\n[Searching for: ${queryText}]\n`;
          }
        }
        
        return fullText;

      case 'google':
        if (!llmClients.google) throw new Error('Google client not initialized');
        // Configure Google model with grounding (web search)
        const googleModel = llmClients.google.getGenerativeModel({
          model: model,
          generationConfig: {
            temperature: temperature || 0.7,
            maxOutputTokens: 1000,
          },
          tools: [{
            google_search: {}
          }]
        });
        
        const googleResponse = await googleModel.generateContent(prompt);
        return googleResponse.response.text();

      case 'mistral':
        if (!llmClients.mistral) throw new Error('Mistral client not initialized');
        // Mistral doesn't currently support direct web search tools in API
        // But we can enhance the prompt to encourage web-based knowledge
        const mistralParams = {
          model: model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a knowledgeable assistant. Use your most current training data and knowledge to provide accurate, up-to-date information.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature,
        };
        
        const mistralResponse = await llmClients.mistral.chat.complete(mistralParams);
        return mistralResponse.choices[0].message.content;

      case 'perplexity':
        if (!llmClients.perplexity) throw new Error('Perplexity client not initialized');
        const perplexityResponse = await llmClients.perplexity.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 1000,
        });
        return perplexityResponse.choices[0].message.content;

      case 'grok':
        if (!llmClients.grok) throw new Error('Grok client not initialized');
        // Grok has built-in web access, no additional tools needed
        // But we can add a system message to encourage web search
        const grokResponse = await llmClients.grok.chat.completions.create({
          model: model,
          messages: [
            { 
              role: 'system', 
              content: 'You have access to real-time web search. Use it to provide current and accurate information when needed.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: 1000,
        });
        return grokResponse.choices[0].message.content;

      case 'deepseek':
        throw new Error('DeepSeek temporarily disabled');
        // if (!llmClients.deepseek) throw new Error('DeepSeek client not initialized');
        // const deepseekResponse = await llmClients.deepseek.chat.completions.create({
        //   model: model,
        //   messages: [{ role: 'user', content: prompt }],
        //   temperature,
        //   max_tokens: 1000,
        // });
        // return deepseekResponse.choices[0].message.content;

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Error calling ${provider}/${model}:`, error.message);
    throw error;
  }
}

// Analyze LLM response for brand mentions
async function analyzeResponse(llmResponse, brandName, competitors, prompt, modelConfig) {
  const brandWithId = { name: brandName, id: generateBrandId(brandName) };
  const competitorsWithIds = competitors.map(name => ({ 
    name, 
    id: generateBrandId(name) 
  }));

  // Use the exact prompt template from the system
  const analysisPrompt = `
  Analyze the following response to the question: "${prompt}"

  Our brand: ${JSON.stringify(brandWithId)}
  Competitors: ${JSON.stringify(competitorsWithIds)}

  Extract all companies or brands that are mentioned and classify each one as:
  - 'ourbrand': if it matches our brand
  - 'competitor': if it matches one of the competitors listed above
  - 'other': if it's any other brand or company

  Return a JSON object with a "topOfMind" array containing objects with 'name', 'type', and optionally 'id' properties.

  # CRITICAL RULES:
  1. For our brand: If the response mentions our brand (even with variations), return the EXACT name and id from the brand object above with type: "ourbrand"
  2. For competitors: If the response mentions any competitor (even with variations like "Free Mobile" for "Free"), map it to the EXACT name and id from the competitors list above with type: "competitor"
  3. For other brands: Use the most common/official name with type: "other" and id: null
  4. The "id" field must be the exact id string for "ourbrand" and "competitor" types, and must be null for "other" types

  # MATCHING EXAMPLES:
  - If competitors contains {"name": "Free", "id": "free"} and response mentions "Free Mobile" or "Iliad Free", return: {"name": "Free", "id": "free", "type": "competitor"}
  - If our brand is {"name": "Orange", "id": "orange"} and response mentions "Orange S.A.", return: {"name": "Orange", "id": "orange", "type": "ourbrand"}
  - If response mentions "Apple" (not in our lists), return: {"name": "Apple", "type": "other", "id": null}

  Response: ${llmResponse}
  `;

  // System prompt for visibility analysis
  const systemPrompt = `
  You are a brand awareness analyst. Your task is to analyze responses to an open-ended question
  about companies or brands in a specific industry. You should determine if a specific brand
  was mentioned without prompting, and list all brands or companies that were mentioned.
  `;

  try {
    // Use GPT-4o for analysis (most reliable for structured output)
    const analysisMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: analysisPrompt }
    ];
    
    const response = await llmClients.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: analysisMessages,
      temperature: 0.2,
      max_tokens: 500,
    });
    
    const analysisResponseText = response.choices[0].message.content;
    
    // Parse the JSON response with better error handling
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisResponseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response');
      }
      
      // Clean up common JSON issues
      let jsonStr = jsonMatch[0];
      // Remove trailing commas before closing brackets/braces
      jsonStr = jsonStr.replace(/,\s*([\]\}])/g, '$1');
      // Fix missing commas between array elements
      jsonStr = jsonStr.replace(/(\})\s*\n\s*(\{)/g, '$1,$2');
      // Remove any control characters
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, '');
      
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error(`JSON parsing error: ${parseError.message}`);
      console.error(`Raw response: ${analysisResponseText.substring(0, 500)}...`);
      
      // Fallback: try to extract brands manually
      const brands = [];
      const brandPattern = /"name"\s*:\s*"([^"]+)"/g;
      const typePattern = /"type"\s*:\s*"(ourbrand|competitor|other)"/g;
      
      let match;
      const names = [];
      const types = [];
      
      while ((match = brandPattern.exec(analysisResponseText)) !== null) {
        names.push(match[1]);
      }
      
      while ((match = typePattern.exec(analysisResponseText)) !== null) {
        types.push(match[1]);
      }
      
      // Pair up names and types
      for (let i = 0; i < Math.min(names.length, types.length); i++) {
        brands.push({
          name: names[i],
          type: types[i],
          id: types[i] === 'other' ? null : generateBrandId(names[i])
        });
      }
      
      result = { topOfMind: brands };
    }
    
    const topOfMind = result.topOfMind || [];
    
    // Check if our brand was mentioned
    const mentioned = topOfMind.some(brand => brand.type === 'ourbrand');
    
    return {
      llmProvider: modelConfig.provider,
      llmModel: modelConfig.model,
      llmName: modelConfig.name,
      mentioned,
      topOfMind,
      originalPrompt: prompt,
      llmResponse
    };
  } catch (error) {
    console.error('Error analyzing response:', error.message);
    return {
      llmProvider: modelConfig.provider,
      llmModel: modelConfig.model,
      llmName: modelConfig.name,
      mentioned: false,
      topOfMind: [],
      originalPrompt: prompt,
      llmResponse,
      error: error.message
    };
  }
}

// Run visibility test for a single company
async function runVisibilityTestForCompany(company, competitors) {
  // Parse visibility prompts
  const visibilityPrompts = [];
  for (let j = 1; j <= 5; j++) {
    const prompt = company[`Prompt Visibility #${j}`];
    if (prompt && prompt.trim()) {
      visibilityPrompts.push(prompt.trim());
    }
  }

  if (visibilityPrompts.length === 0) {
    console.log(`Skipping ${company['Start-up']} - no visibility prompts found`);
    return [];
  }
  
  // Create a limiter for parallel execution
  const limit = pLimit(PARALLEL_LIMIT);
  
  // Create all tasks
  const tasks = [];
  for (let run = 1; run <= NUM_RUNS; run++) {
    for (let promptIdx = 0; promptIdx < visibilityPrompts.length; promptIdx++) {
      const prompt = visibilityPrompts[promptIdx];
      for (const modelConfig of modelConfigs) {
        // Create a task for each combination
        const task = limit(async () => {
          try {
            console.log(`  Run ${run}/${NUM_RUNS}, Model: ${modelConfig.name}, Prompt ${promptIdx + 1}/${visibilityPrompts.length}`);
            
            // Call LLM
            const llmResponse = await callLLM(modelConfig.provider, modelConfig.model, prompt);
            
            // Analyze response
            const analysis = await analyzeResponse(
              llmResponse,
              company['Start-up'],
              competitors,
              prompt,
              modelConfig
            );
            
            return {
              ...analysis,
              runIndex: run - 1,
              promptIndex: promptIdx
            };
            
          } catch (error) {
            console.error(`  Error with ${modelConfig.name}: ${error.message}`);
            return {
              llmProvider: modelConfig.provider,
              llmModel: modelConfig.model,
              llmName: modelConfig.name,
              mentioned: false,
              topOfMind: [],
              originalPrompt: prompt,
              error: error.message,
              runIndex: run - 1,
              promptIndex: promptIdx
            };
          }
        });
        
        tasks.push(task);
      }
    }
  }
  
  // Execute all tasks in parallel (limited by PARALLEL_LIMIT)
  console.log(`   Executing ${tasks.length} tasks (${NUM_RUNS} runs × ${visibilityPrompts.length} prompts × ${modelConfigs.length} models)`);
  console.log(`   Using ${PARALLEL_LIMIT} parallel workers...`);
  
  // Track progress
  let completed = 0;
  const progressTasks = tasks.map(task => 
    task.then(result => {
      completed++;
      if (completed % 10 === 0 || completed === tasks.length) {
        console.log(`   Progress: ${completed}/${tasks.length} (${((completed/tasks.length) * 100).toFixed(0)}%)`);
      }
      return result;
    })
  );
  
  const results = await Promise.all(progressTasks);
  
  // Show brief summary of results by model
  const modelSummary = {};
  results.forEach(r => {
    if (!r.error) {
      const key = r.llmName || r.llmProvider;
      if (!modelSummary[key]) {
        modelSummary[key] = { mentioned: 0, total: 0 };
      }
      modelSummary[key].total++;
      if (r.mentioned) modelSummary[key].mentioned++;
    }
  });
  
  console.log(`\n   Model Performance:`);
  Object.entries(modelSummary).forEach(([model, stats]) => {
    const rate = (stats.mentioned / stats.total * 100).toFixed(1);
    console.log(`   - ${model}: ${rate}% (${stats.mentioned}/${stats.total})`);
  });
  
  return results;
}

// Discover competitors using LLM (same as main application)
async function discoverCompetitors(company, language) {
  const brandName = company['Start-up'];
  const url = company['URL'];
  const market = company['Main Market (2025)'];
  
  // Build the competitors discovery prompt (simplified without scraped data)
  const prompt = `
    ## GOAL:
    I need to identify the main competitors for "${brandName}", a company in the ${market} market (website: ${url}).

    IMPORTANT: You have the capability to search the web. First, search the web for up-to-date information about this company's competitors.
    Look for industry reports, market analysis, business directories, and comparison sites.

    ## INSTRUCTIONS:
    Based on your web search, please identify 3-5 direct competitors of ${brandName}.
    Return the biggest competitors (per revenues and/or market share, traffic, etc.) in order of importance.
    These should be actual company names that compete in the same market space, not generic categories.

    ## OUTPUT LANGUAGE:
    **Output language MUST BE ${language}**

    ## OUTPUT:
    Return your analysis as a valid JSON object with the following structure:
    {
      "competitors": ["Competitor1", "Competitor2", "Competitor3", "Competitor4", "Competitor5"]
    }
  `;

  const systemPrompt = `
    You are a competitive intelligence analyst specializing in identifying direct competitors of companies.
    You have access to web search capability. Your task is to search the web for competitive information
    and identify actual company names that are direct competitors to the target company.
  `;

  try {
    // Try with Perplexity first (it has built-in web search)
    if (llmClients.perplexity) {
      try {
        console.log(`  Discovering competitors using Perplexity with web search...`);
        const response = await llmClients.perplexity.chat.completions.create({
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500,
        });
        
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return result.competitors || [];
        }
      } catch (error) {
        console.error(`  Perplexity error: ${error.message}`);
      }
    }
    
    // Fallback to GPT-4o with web search instruction
    if (llmClients.openai) {
      console.log(`  Discovering competitors using GPT-4o with web search...`);
      const response = await llmClients.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });
      
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.competitors || [];
      }
    }
    
    throw new Error('No suitable LLM available for competitor discovery');
    
  } catch (error) {
    console.error(`  Failed to discover competitors: ${error.message}`);
    // Return empty array if discovery fails
    return [];
  }
}

// Calculate summary statistics for display
function calculateSummaryStats(results) {
  const validResults = results.filter(r => !r.error);
  
  if (validResults.length === 0) {
    return {
      successfulRuns: 0,
      averageScore: 0,
      brandFoundCount: 0,
      competitorsFound: [],
      allBrandsFound: []
    };
  }

  // Calculate average mention rate
  const mentionCount = validResults.filter(r => r.mentioned).length;
  const averageScore = mentionCount / validResults.length;

  // Aggregate brand mentions
  const brandMentionCounts = new Map();
  const competitorMentionCounts = new Map();
  const allBrandCounts = new Map();

  validResults.forEach(result => {
    result.topOfMind.forEach(brand => {
      const brandName = brand.name;
      
      allBrandCounts.set(brandName, (allBrandCounts.get(brandName) || 0) + 1);

      if (brand.type === 'ourbrand') {
        brandMentionCounts.set(brandName, (brandMentionCounts.get(brandName) || 0) + 1);
      } else if (brand.type === 'competitor') {
        competitorMentionCounts.set(brandName, (competitorMentionCounts.get(brandName) || 0) + 1);
      }
    });
  });

  return {
    successfulRuns: validResults.length,
    averageScore: averageScore,
    brandFoundCount: Array.from(brandMentionCounts.values()).reduce((sum, count) => sum + count, 0),
    competitorsFound: Array.from(competitorMentionCounts.keys()),
    allBrandsFound: Array.from(allBrandCounts.keys())
  };
}

// Initialize CSV file with headers
async function initializeCSV() {
  const headers = [
    'Company',
    'URL', 
    'Market',
    'Language',
    'Discovered Competitors',
    'Run Number',
    'Prompt Index',
    'Prompt Text',
    'Model Provider',
    'Model Name',
    'Model ID',
    'Brand Mentioned',
    'LLM Response',
    'Analysis Error',
    'Top of Mind Brands',
    'Our Brand Count',
    'Competitor Brands Count',
    'Other Brands Count'
  ];

  // Write headers to file
  const headerLine = headers.map(h => `"${h}"`).join(',');
  fs.writeFileSync(OUTPUT_CSV, headerLine + '\n');
  
  return headers;
}

// Append results to CSV (one row per model per prompt per company)
async function appendResultsToCSV(company, competitors, results) {
  const discoveredCompetitorsStr = competitors.join('; ');
  
  results.forEach(result => {
    if (result.error) {
      // Still write error rows for completeness
      const row = [
        company['Start-up'],
        company['URL'],
        company['Main Market (2025)'],
        company['Language'],
        discoveredCompetitorsStr,
        result.runIndex + 1,
        result.promptIndex + 1,
        (result.originalPrompt || ''), // Full prompt text
        result.llmProvider,
        result.llmName,
        result.llmModel,
        'ERROR',
        '',
        result.error,
        '',
        0,
        0,
        0
      ];
      
      // Escape and format CSV row
      const csvRow = row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
      
      fs.appendFileSync(OUTPUT_CSV, csvRow + '\n');
    } else {
      // Count brand types
      const ourBrandCount = result.topOfMind.filter(b => b.type === 'ourbrand').length;
      const competitorCount = result.topOfMind.filter(b => b.type === 'competitor').length; 
      const otherCount = result.topOfMind.filter(b => b.type === 'other').length;
      
      const row = [
        company['Start-up'],
        company['URL'],
        company['Main Market (2025)'],
        company['Language'],
        discoveredCompetitorsStr,
        result.runIndex + 1,
        result.promptIndex + 1,
        (result.originalPrompt || ''), // Full prompt text
        result.llmProvider,
        result.llmName, 
        result.llmModel,
        result.mentioned ? 'YES' : 'NO',
        (result.llmResponse || ''), // Full LLM response
        result.error || '',
        result.topOfMind.map(b => `${b.name}(${b.type})`).join('; '),
        ourBrandCount,
        competitorCount,
        otherCount
      ];
      
      // Escape and format CSV row
      const csvRow = row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
      
      fs.appendFileSync(OUTPUT_CSV, csvRow + '\n');
    }
  });
}

// This function is no longer used - we write directly to CSV as we go

// Main function
async function main() {
  console.log(`Standalone Visibility Pipeline Test`);
  console.log(`Configuration:`);
  console.log(`- Runs per company: ${NUM_RUNS}`);
  console.log(`- Parallel API calls: ${PARALLEL_LIMIT}`);
  console.log(`- Max companies: ${MAX_COMPANIES || 'all'}`);
  console.log(`- Input: ${INPUT_CSV}`);
  console.log(`- Output: ${OUTPUT_CSV}`);
  
  // Check available models
  if (modelConfigs.length === 0) {
    console.error('No LLM API keys found in environment. Please set at least one of:');
    console.error('- OPENAI_API_KEY (for GPT-4o)');
    console.error('- ANTHROPIC_API_KEY (for Claude models)');
    console.error('- GOOGLE_API_KEY (for Gemini 2.0)');
    console.error('- MISTRAL_API_KEY (for Mistral Medium)');
    console.error('- PERPLEXITY_API_KEY (for Perplexity Sonar Pro)');
    console.error('- XAI_API_KEY (for Grok 3)');
    // console.error('- DEEPSEEK_API_KEY (for DeepSeek Chat)');
    process.exit(1);
  }
  
  // Check if we need OpenAI for analysis
  if (!llmClients.openai) {
    console.error('\nWARNING: OpenAI API key not found. GPT-4o is required for analyzing responses.');
    console.error('Please set OPENAI_API_KEY in your .env file.');
    process.exit(1);
  }
  
  console.log(`\nAvailable models (${modelConfigs.length}):`);
  modelConfigs.forEach(config => {
    console.log(`- ${config.name} (${config.provider}/${config.model})`);
  });

  // Parse input CSV
  const allCompanies = await parseCSV(INPUT_CSV);
  console.log(`\nLoaded ${allCompanies.length} companies from CSV`);
  
  // Apply max companies limit if specified
  const companies = MAX_COMPANIES > 0 ? allCompanies.slice(0, MAX_COMPANIES) : allCompanies;
  if (MAX_COMPANIES > 0) {
    console.log(`Processing only the first ${MAX_COMPANIES} companies`);
  }
  console.log('');

  // Initialize CSV file with headers
  const headers = await initializeCSV();
  console.log(`Initialized output CSV: ${OUTPUT_CSV}\n`);

  // Results are written directly to CSV as we process each company

  // Process each company
  // Calculate estimated tasks
  const totalModels = modelConfigs.length;
  const avgPromptsPerCompany = 5; // Assuming most companies have 5 prompts
  const totalTasks = companies.length * avgPromptsPerCompany * totalModels * NUM_RUNS;
  console.log(`\nEstimated total API calls: ~${totalTasks}`);
  console.log(`With ${PARALLEL_LIMIT} parallel workers, this should take approximately ${Math.ceil(totalTasks / PARALLEL_LIMIT)} batches\n`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const startTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${i + 1}/${companies.length}] Processing ${company['Start-up']}`);
    console.log(`${'='.repeat(80)}`);

    // Discover competitors using LLM (only once)
    const language = company['Language']?.includes('FR') ? 'French' : 'English';
    console.log(`\n📊 Discovering competitors for ${company['Start-up']}...`);
    const competitors = await discoverCompetitors(company, language);
    console.log(`✅ Discovered ${competitors.length} competitors: ${competitors.join(', ')}`);

    // Run visibility tests
    console.log(`\n🚀 Running visibility tests...`);
    const results = await runVisibilityTestForCompany(company, competitors);
    
    // Write results immediately to CSV (one row per model per prompt)
    await appendResultsToCSV(company, competitors, results);
    
    // Calculate summary stats for display
    const stats = calculateSummaryStats(results);

    // Show summary results
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n📈 Results Summary:`);
    console.log(`   - Brand visibility score: ${(stats.averageScore * 100).toFixed(1)}%`);
    console.log(`   - Brand found ${stats.brandFoundCount} times out of ${stats.successfulRuns} tests`);
    
    if (stats.competitorsFound.length > 0) {
      console.log(`   - Competitors mentioned: ${stats.competitorsFound.join(', ')}`);
    } else {
      console.log(`   - No competitors were mentioned`);
    }
    
    if (stats.allBrandsFound.length > 5) {
      console.log(`   - Top brands mentioned: ${stats.allBrandsFound.slice(0, 5).join(', ')} (and ${stats.allBrandsFound.length - 5} more)`);
    } else if (stats.allBrandsFound.length > 0) {
      console.log(`   - All brands mentioned: ${stats.allBrandsFound.join(', ')}`);
    }
    
    console.log(`\n💾 Results saved to CSV`);
    console.log(`✅ Completed in ${elapsed}s\n`);
  }

  console.log(`\nCompleted! All results written to ${OUTPUT_CSV}`);
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});