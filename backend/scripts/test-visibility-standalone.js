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
const { ChatPerplexity } = require('@langchain/community/chat_models/perplexity');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { createXai } = require('@ai-sdk/xai');
const { generateText } = require('ai');
const axios = require('axios');

/**
 * Standalone Visibility Pipeline Testing Script
 * 
 * This script runs visibility and sentiment tests without requiring the full application context.
 * It directly calls LLM APIs to test brand visibility and sentiment across multiple models.
 * 
 * Enabled models (from config.json):
 * - GPT-4o (OpenAI)
 * - Gemini 2.0 Flash (Google)
 * - Perplexity Sonar Pro
 * - Mistral Medium 2025
 * - Grok 3 Latest
 * - Claude models (removed from execution)
 * - DeepSeek Chat (temporarily disabled due to JSON parsing issues)
 * 
 * Usage:
 *   node scripts/test-visibility-standalone.js [options]
 * 
 * Options:
 *   --runs <number>      Number of runs per company (default: 5)
 *   --parallel <number>  Number of parallel API calls (default: 10)
 *   --companies <number> Maximum companies to process, 0 for all (default: 0)
 *   --help, -h           Show help message
 * 
 * Examples:
 *   node scripts/test-visibility-standalone.js                                    # 5 runs, 10 parallel, all companies
 *   node scripts/test-visibility-standalone.js --runs 10                          # 10 runs, 10 parallel, all companies
 *   node scripts/test-visibility-standalone.js --runs 10 --parallel 20            # 10 runs, 20 parallel, all companies
 *   node scripts/test-visibility-standalone.js --runs 5 --parallel 10 --companies 3  # 5 runs, 10 parallel, first 3 companies
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
 *   Includes both visibility analysis (brand mentions) and sentiment analysis
 */

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    runs: 5,
    parallel: 10,
    companies: 0,
    urls: [],
    model: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--runs':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.runs = parseInt(nextArg);
          i++; // Skip next argument as it's the value
        }
        break;
      case '--parallel':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.parallel = parseInt(nextArg);
          i++; // Skip next argument as it's the value
        }
        break;
      case '--companies':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.companies = parseInt(nextArg);
          i++; // Skip next argument as it's the value
        }
        break;
      case '--urls':
        // Collect all URLs until the next flag or end of args
        i++;
        while (i < args.length && !args[i].startsWith('--')) {
          config.urls.push(args[i]);
          i++;
        }
        i--; // Back up one since the loop will increment
        break;
      case '--model':
        if (nextArg && !nextArg.startsWith('--')) {
          config.model = nextArg;
          i++; // Skip next argument as it's the value
        }
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node scripts/test-visibility-standalone.js [options]

Options:
  --runs <number>      Number of runs per company (default: 5)
  --parallel <number>  Number of parallel API calls (default: 10)
  --companies <number> Maximum companies to process, 0 for all (default: 0)
  --urls <url1> <url2> ... Process only companies with these URLs
  --model <name>       Run only specific model (e.g., gpt-4o, gemini-2.0-flash)
  --help, -h           Show this help message

Examples:
  node scripts/test-visibility-standalone.js --runs 3 --parallel 5 --companies 2
  node scripts/test-visibility-standalone.js --runs 10 --parallel 20
  node scripts/test-visibility-standalone.js --companies 5
  node scripts/test-visibility-standalone.js --urls https://example.com https://another.com
  node scripts/test-visibility-standalone.js --runs 1 --urls https://specific-company.com
  node scripts/test-visibility-standalone.js --model gpt-4o --runs 1
  node scripts/test-visibility-standalone.js --model gemini-2.0-flash --companies 2
`);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          console.error('Use --help for usage information');
          process.exit(1);
        }
        break;
    }
  }
  
  return config;
}

// Configuration
const config = parseArgs();
const NUM_RUNS = config.runs;
const PARALLEL_LIMIT = config.parallel; // Number of parallel API calls
const MAX_COMPANIES = config.companies; // 0 means process all
const FILTER_URLS = config.urls; // Array of URLs to filter companies
const INPUT_CSV = path.join(__dirname, 'data', 'Database Citations - Next 40 v2.csv');
const OUTPUT_CSV = path.join(__dirname, 'data', `visibility-results-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${NUM_RUNS}runs.csv`);

// Initialize LLM clients and model configurations
const llmClients = {};
const modelConfigs = [];

if (process.env.OPENAI_API_KEY) {
  llmClients.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  modelConfigs.push({ provider: 'openai', model: 'gpt-4o', name: 'GPT-4o' });
}

// Claude models removed from execution
// if (process.env.ANTHROPIC_API_KEY) {
//   llmClients.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//   modelConfigs.push(
//     { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' }
//   );
// }

if (process.env.GOOGLE_API_KEY) {
  llmClients.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  modelConfigs.push({ provider: 'google', model: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' });
}

if (process.env.MISTRAL_API_KEY) {
  llmClients.mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  modelConfigs.push({ provider: 'mistral', model: 'mistral-medium-2505', name: 'Mistral Medium 2025' });
}

if (process.env.PERPLEXITY_API_KEY) {
  // Perplexity uses LangChain directly, no client initialization needed
  modelConfigs.push({ provider: 'perplexity', model: 'sonar-pro', name: 'Perplexity Sonar Pro' });
}

if (process.env.XAI_API_KEY) {
  llmClients.grok = createXai({
    apiKey: process.env.XAI_API_KEY,
  });
  modelConfigs.push({ provider: 'grok', model: 'grok-3-beta', name: 'Grok 3 Latest' });
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

// Helper function to resolve Vertex AI Search redirect URLs (from Google adapter)
async function resolveRedirectUrl(redirectUrl, title) {
  try {
    // Only attempt to resolve if it's a Vertex AI Search redirect URL
    if (!redirectUrl.includes('vertexaisearch.cloud.google.com/grounding-api-redirect/')) {
      return redirectUrl;
    }

    // Make a HEAD request to follow redirects without downloading content
    const response = await axios.head(redirectUrl, {
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      timeout: 5000, // 5 second timeout
    });

    // In Node.js, axios stores the final URL in response.request.res.responseUrl
    const finalUrl = response.request.res?.responseUrl || response.config.url;

    if (finalUrl && finalUrl !== redirectUrl && !finalUrl.includes('vertexaisearch.cloud.google.com')) {
      console.log(`Resolved redirect URL: ${redirectUrl} -> ${finalUrl}`);
      return finalUrl;
    }

    // If we still have a vertexai URL, try to construct from title
    if (title) {
      // Extract domain from title if possible
      const domainMatch = title.match(/(?:https?:\/\/)?(?:www\.)?([^\s\/]+\.[^\s\/]+)/i);
      if (domainMatch) {
        const constructedUrl = `https://${domainMatch[1]}`;
        console.log(`Constructed URL from title: ${title} -> ${constructedUrl}`);
        return constructedUrl;
      }

      // If title looks like a domain, use it
      if (title.includes('.') && !title.includes(' ')) {
        const constructedUrl = title.startsWith('http') ? title : `https://${title}`;
        console.log(`Using title as URL: ${constructedUrl}`);
        return constructedUrl;
      }
    }

    // As last resort, if we have a title but couldn't extract domain, return empty
    // This ensures we never return vertexaisearch URLs
    console.log(`Could not resolve redirect URL and no valid domain in title: ${redirectUrl}`);
    return '';
  } catch (error) {
    // If resolution fails and we have a title, try to use it
    console.log(`Failed to resolve redirect URL ${redirectUrl}: ${error.message}`);

    if (title) {
      // Try to extract domain from title
      const domainMatch = title.match(/(?:https?:\/\/)?(?:www\.)?([^\s\/]+\.[^\s\/]+)/i);
      if (domainMatch) {
        return `https://${domainMatch[1]}`;
      }

      // If title looks like a domain, use it
      if (title.includes('.') && !title.includes(' ')) {
        return title.startsWith('http') ? title : `https://${title}`;
      }
    }

    // Never return vertexaisearch URLs
    return '';
  }
}

// Call LLM based on provider and model (matches real adapter implementations)
async function callLLM(provider, model, prompt, temperature = 0.7) {
  try {
    let websitesConsulted = [];
    let response;
    
    switch (provider) {
      case 'openai':
        if (!llmClients.openai) throw new Error('OpenAI client not initialized');
        
        // Try using the responses endpoint with web search (matches real adapter exactly)
        if (model.includes('gpt-4o')) {
          try {
            const responseResult = await llmClients.openai.responses.create({
              model: model,
              input: prompt,
              temperature,
              tools: [{ type: 'web_search_preview' }]
            });
            
            let text = '';
            // Extract websites from url_citation annotations (exact real adapter logic)
            if (Array.isArray(responseResult.output)) {
              for (const item of responseResult.output) {
                if (item.type === 'message' && Array.isArray(item.content)) {
                  for (const contentItem of item.content) {
                    if (contentItem.type === 'output_text') {
                      if (contentItem.text) text += contentItem.text;
                      
                      // Extract citations from annotations (real adapter logic)
                      if (Array.isArray(contentItem.annotations)) {
                        for (const annotation of contentItem.annotations) {
                          if (annotation.type === 'url_citation' && annotation.url) {
                            websitesConsulted.push(annotation.url);
                          }
                        }
                      }
                    }
                  }
                }
              }
            } else {
              // Fallback: if not an array, try to get output_text
              text = responseResult.output_text || '';
            }
            
            response = text;
            // Deduplicate websites
            websitesConsulted = [...new Set(websitesConsulted)];
            break;
          } catch (error) {
            console.log(`Web search failed for ${model}, falling back to regular completion: ${error.message}`);
          }
        }
        
        // Fallback to regular chat completion (no web search, no citations)
        const openaiResponse = await llmClients.openai.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: 1000,
        });
        response = openaiResponse.choices[0].message.content;
        break;

      case 'anthropic':
        if (!llmClients.anthropic) throw new Error('Anthropic client not initialized');
        
        const anthropicResponse = await llmClients.anthropic.messages.create({
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
        });
        
        // Extract text and websites from blocks (real adapter logic)
        let fullText = '';
        const webSearchResults = {};
        
        for (const block of anthropicResponse.content) {
          if (block.type === 'text') {
            fullText += block.text;
            // Extract citations from text block (real adapter logic)
            if (block.citations && Array.isArray(block.citations)) {
              for (const citation of block.citations) {
                if (citation.url) {
                  websitesConsulted.push(citation.url);
                }
              }
            }
          } else if (block.type === 'server_tool_use' && block.name === 'web_search') {
            const queryText = block.input?.query || 'information';
            fullText += `\n[Searching for: ${queryText}]\n`;
          } else if (block.type === 'web_search_tool_result') {
            // Extract URLs from search results (real adapter logic)
            if (block.content && Array.isArray(block.content)) {
              for (const result of block.content) {
                if (result.type === 'web_search_result' && result.url) {
                  webSearchResults[result.url] = {
                    url: result.url,
                    title: result.title
                  };
                  websitesConsulted.push(result.url);
                }
              }
            }
          }
        }
        
        response = fullText;
        websitesConsulted = [...new Set(websitesConsulted)];
        break;

      case 'google':
        if (!llmClients.google) throw new Error('Google client not initialized');
        
        const googleModel = llmClients.google.getGenerativeModel({
          model: model,
          generationConfig: {
            temperature: temperature || 0.7,
            maxOutputTokens: 1000,
          },
          tools: [{ google_search: {} }]
        });
        
        const googleResponse = await googleModel.generateContent(prompt);
        response = googleResponse.response.text();
        
        // Extract grounding metadata from the first candidate (exact real adapter logic)
        const candidate = googleResponse.response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;
        
        if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
          const processedUrls = new Set();
          
          // Process each grounding chunk and resolve redirect URLs (real adapter logic)
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web?.uri && !processedUrls.has(chunk.web.uri)) {
              processedUrls.add(chunk.web.uri);
              
              // Attempt to resolve redirect URLs, passing title for fallback
              const resolvedUrl = await resolveRedirectUrl(chunk.web.uri, chunk.web.title);
              
              // Only add URL if we got a valid URL (not empty)
              if (resolvedUrl) {
                websitesConsulted.push(resolvedUrl);
              }
            }
          }
        }
        
        websitesConsulted = [...new Set(websitesConsulted)];
        break;

      case 'mistral':
        if (!llmClients.mistral) throw new Error('Mistral client not initialized');
        
        // Mistral doesn't have native web search tools, but we extract URLs from response
        const mistralResponse = await llmClients.mistral.chat.complete({
          model: model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a knowledgeable assistant. Use your most current training data and knowledge to provide accurate, up-to-date information.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature,
        });
        response = mistralResponse.choices[0].message.content;
        
        // Extract URLs from the response (like the real adapter)
        const urlRegex = /https?:\/\/[^\s\)\]]+/g;
        const urls = response.match(urlRegex) || [];
        
        // Look for markdown links [title](url)
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let match;
        const foundUrls = new Set();
        
        while ((match = markdownLinkRegex.exec(response)) !== null) {
          if (!foundUrls.has(match[2])) {
            foundUrls.add(match[2]);
          }
        }
        
        // Add standalone URLs not already captured
        for (const url of urls) {
          if (!foundUrls.has(url)) {
            foundUrls.add(url);
          }
        }
        
        websitesConsulted = Array.from(foundUrls);
        break;

      case 'perplexity':
        if (!process.env.PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured');
        
        // Use LangChain like the real adapter for proper citation extraction
        const chatModel = new ChatPerplexity({
          apiKey: process.env.PERPLEXITY_API_KEY,
          model: model,
          temperature: temperature || 0.7,
          maxTokens: 1000,
        });

        const messages = [new HumanMessage(prompt)];
        const perplexityResponse = await chatModel.invoke(messages);
        
        // Extract text from response
        response = perplexityResponse.content.toString();
        
        // Extract URLs using the same logic as real adapter
        const uniqueUrls = [];
        
        // Get the raw response data (LangChain provides this)
        const raw = perplexityResponse._raw || {};
        
        // Check for direct citations array (primary source in latest API)
        const directCitations = raw.citations || perplexityResponse.additional_kwargs?.citations || [];
        if (Array.isArray(directCitations) && directCitations.length > 0) {
          for (const url of directCitations) {
            if (typeof url === 'string' && url.startsWith('http') && !uniqueUrls.includes(url)) {
              uniqueUrls.push(url);
            }
          }
        }
        
        // Fallback to legacy sources if no direct citations
        if (uniqueUrls.length === 0) {
          const sources = raw.web_search_results || raw.sources || [];
          if (Array.isArray(sources)) {
            for (const source of sources) {
              if (source.url && !uniqueUrls.includes(source.url)) {
                uniqueUrls.push(source.url);
              }
            }
          }
        }
        
        // Final fallback to regex extraction from text
        if (uniqueUrls.length === 0) {
          const urlRegex = /\b(https?:\/\/[\w\.-]+\.[a-z]{2,}[\w\.\/\-\?\=\&\%]*)/gi;
          const urls = response.match(urlRegex) || [];
          for (const url of urls) {
            if (!uniqueUrls.includes(url)) {
              uniqueUrls.push(url);
            }
          }
        }
        
        websitesConsulted = [...new Set(uniqueUrls)];
        break;

      case 'grok':
        if (!llmClients.grok) throw new Error('Grok client not initialized');
        
        // Use AI SDK like the real adapter
        const grokResult = await generateText({
          model: llmClients.grok(model),
          prompt,
          temperature,
          maxTokens: 1000,
        });
        
        response = grokResult.text;
        
        // Extract sources from the generateText result (real adapter logic)
        if (grokResult.sources && grokResult.sources.length > 0) {
          for (const source of grokResult.sources) {
            if ('url' in source && source.url) {
              websitesConsulted.push(source.url);
            }
          }
        }
        
        // Check tool calls for additional web search URLs
        if (grokResult.toolCalls && grokResult.toolCalls.length > 0) {
          // Tool calls don't directly contain URLs, but indicate web search was used
          // The actual URLs would be in sources
        }
        
        // Fallback to regex extraction if no sources found
        if (websitesConsulted.length === 0) {
          const urlRegex = /\b(https?:\/\/[\w\.-]+\.[a-z]{2,}[\w\.\/\-\?\=\&\%]*)/gi;
          const urls = response.match(urlRegex) || [];
          websitesConsulted.push(...urls);
        }
        
        websitesConsulted = [...new Set(websitesConsulted)];
        break;

      case 'deepseek':
        throw new Error('DeepSeek temporarily disabled');

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    return { response, websitesConsulted };
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

// Default sentiment prompts (from the real implementation)
const SENTIMENT_PROMPTS = [
  "What's your opinion on {COMPANY}?",
  "What are the main strengths and weaknesses of {COMPANY}?",
  "What do customers and reviews say about {COMPANY} and its products or services?"
];

// Analyze sentiment from LLM response
async function analyzeSentiment(llmResponse, brandName, originalPrompt) {
  const systemPrompt = `You are a sentiment analysis expert. Your task is to analyze text for sentiment towards a specific brand and extract relevant keywords.`;
  
  const analysisPrompt = `Analyze the sentiment in the following response to the question: "${originalPrompt}"

Determine if the sentiment towards "${brandName}" is positive, neutral, or negative.
Also extract *the most important* key words (1 to 3 words) about the brand, negative (max 3) or positive (max 3).

Return a JSON object with this exact structure:
{
  "sentiment": "positive|neutral|negative",
  "extractedPositiveKeywords": ["keyword1", "keyword2"],
  "extractedNegativeKeywords": ["keyword1", "keyword2"]
}

Response: ${llmResponse}`;

  try {
    const response = await llmClients.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.2,
      max_tokens: 500,
    });
    
    const analysisResponseText = response.choices[0].message.content;
    
    // Parse the JSON response
    const jsonMatch = analysisResponseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in analysis response');
    }
    
    let jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/,\s*([\]\}])/g, '$1');
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, '');
    
    const result = JSON.parse(jsonStr);
    
    return {
      sentiment: result.sentiment || 'neutral',
      extractedPositiveKeywords: result.extractedPositiveKeywords || [],
      extractedNegativeKeywords: result.extractedNegativeKeywords || []
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error.message);
    return {
      sentiment: 'neutral',
      extractedPositiveKeywords: [],
      extractedNegativeKeywords: []
    };
  }
}

// Calculate overall sentiment score and label
function calculateSentimentSummary(sentimentResults) {
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  
  sentimentResults.forEach(result => {
    switch (result.sentiment) {
      case 'positive': positiveCount++; break;
      case 'negative': negativeCount++; break;
      default: neutralCount++; break;
    }
  });
  
  // Calculate percentage score
  const totalResults = sentimentResults.length;
  if (totalResults === 0) {
    return { overallSentiment: 'neutral', overallSentimentPercentage: 0 };
  }
  
  const sentimentSum = (positiveCount * 1) + (neutralCount * 0) + (negativeCount * -1);
  const averageSentiment = sentimentSum / totalResults;
  const sentimentPercentage = Math.round(averageSentiment * 100);
  
  // Determine overall sentiment by majority
  let overallSentiment = 'neutral';
  if (positiveCount > neutralCount && positiveCount > negativeCount) {
    overallSentiment = 'positive';
  } else if (negativeCount > neutralCount && negativeCount > positiveCount) {
    overallSentiment = 'negative';
  }
  
  return {
    overallSentiment,
    overallSentimentPercentage: sentimentPercentage
  };
}

// Run sentiment test for a single company
async function runSentimentTestForCompany(company) {
  const companyName = company['Start-up'];
  const companyUrl = company['URL'] || '';
  
  console.log(`Running sentiment test for ${companyName}...`);
  
  // Create sentiment prompts with company name
  const sentimentPrompts = SENTIMENT_PROMPTS.map(template => 
    template.replace('{COMPANY}', companyName)
  );
  
  // Add context to each prompt
  const contextualizedPrompts = sentimentPrompts.map(prompt => 
    `${prompt}\n<context>\nURL: ${companyUrl}\n</context>`
  );
  
  // Create a limiter for parallel execution
  const limit = pLimit(PARALLEL_LIMIT);
  
  // Get models to use (either filtered or all)
  const modelsToUse = modelConfigs;
  
  const tasks = [];
  for (let promptIdx = 0; promptIdx < contextualizedPrompts.length; promptIdx++) {
    const prompt = contextualizedPrompts[promptIdx];
    const originalPrompt = sentimentPrompts[promptIdx];
    
    for (const modelConfig of modelsToUse) {
      const task = limit(async () => {
        try {
          console.log(`  Sentiment Model: ${modelConfig.name}, Prompt ${promptIdx + 1}/${contextualizedPrompts.length}`);
          
          // Call LLM
          const llmResult = await callLLM(modelConfig.provider, modelConfig.model, prompt);
          const llmResponse = llmResult.response;
          const websitesConsulted = llmResult.websitesConsulted;
          
          // Analyze sentiment
          const sentimentAnalysis = await analyzeSentiment(llmResponse, companyName, originalPrompt);
          
          return {
            category: 'sentiment',
            llmProvider: modelConfig.provider,
            llmModel: modelConfig.model,
            llmName: modelConfig.name,
            sentiment: sentimentAnalysis.sentiment,
            extractedPositiveKeywords: sentimentAnalysis.extractedPositiveKeywords,
            extractedNegativeKeywords: sentimentAnalysis.extractedNegativeKeywords,
            originalPrompt: originalPrompt,
            llmResponse,
            websitesConsulted,
            promptIndex: promptIdx
          };
          
        } catch (error) {
          console.error(`  Error with ${modelConfig.name}: ${error.message}`);
          return {
            category: 'sentiment',
            llmProvider: modelConfig.provider,
            llmModel: modelConfig.model,
            llmName: modelConfig.name,
            sentiment: 'neutral',
            extractedPositiveKeywords: [],
            extractedNegativeKeywords: [],
            originalPrompt: originalPrompt,
            error: error.message,
            websitesConsulted: [],
            promptIndex: promptIdx
          };
        }
      });
      
      tasks.push(task);
    }
  }
  
  const results = await Promise.all(tasks);
  
  // Calculate sentiment summary
  const validResults = results.filter(r => !r.error);
  const sentimentSummary = calculateSentimentSummary(validResults);
  
  console.log(`  Sentiment summary: ${sentimentSummary.overallSentiment} (${sentimentSummary.overallSentimentPercentage}%)`);
  
  // Add summary info to each result
  return results.map(result => ({
    ...result,
    overallSentiment: sentimentSummary.overallSentiment,
    overallSentimentPercentage: sentimentSummary.overallSentimentPercentage
  }));
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
  
  console.log(`Running visibility test for ${company['Start-up']}...`);
  
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
            const llmResult = await callLLM(modelConfig.provider, modelConfig.model, prompt);
            const llmResponse = llmResult.response;
            const websitesConsulted = llmResult.websitesConsulted;
            
            // Analyze response
            const analysis = await analyzeResponse(
              llmResponse,
              company['Start-up'],
              competitors,
              prompt,
              modelConfig
            );
            
            return {
              category: 'visibility',
              ...analysis,
              websitesConsulted,
              runIndex: run - 1,
              promptIndex: promptIdx
            };
            
          } catch (error) {
            console.error(`  Error with ${modelConfig.name}: ${error.message}`);
            return {
              category: 'visibility',
              llmProvider: modelConfig.provider,
              llmModel: modelConfig.model,
              llmName: modelConfig.name,
              mentioned: false,
              topOfMind: [],
              originalPrompt: prompt,
              error: error.message,
              websitesConsulted: [],
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
    'Category',
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
    'Websites Consulted',
    'Analysis Error',
    'Top of Mind Brands',
    'Our Brand Count',
    'Competitor Brands Count',
    'Other Brands Count',
    'Sentiment',
    'Sentiment Score',
    'Overall Sentiment',
    'Positive Keywords',
    'Negative Keywords'
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
        result.category || 'visibility',
        company['Start-up'],
        company['URL'],
        company['Main Market (2025)'],
        company['Language'],
        discoveredCompetitorsStr,
        result.runIndex + 1 || 1,
        result.promptIndex + 1,
        (result.originalPrompt || ''), // Full prompt text
        result.llmProvider,
        result.llmName,
        result.llmModel,
        'ERROR',
        '',
        (result.websitesConsulted || []).join('; '),
        result.error,
        '',
        0,
        0,
        0,
        result.category === 'sentiment' ? 'neutral' : '',
        result.category === 'sentiment' ? 0 : '',
        result.category === 'sentiment' ? 'neutral' : '',
        '',
        ''
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
      // Handle visibility vs sentiment results differently
      if (result.category === 'sentiment') {
        const row = [
          result.category,
          company['Start-up'],
          company['URL'],
          company['Main Market (2025)'],
          company['Language'],
          discoveredCompetitorsStr,
          1, // Sentiment runs only once
          result.promptIndex + 1,
          (result.originalPrompt || ''),
          result.llmProvider,
          result.llmName,
          result.llmModel,
          '', // No brand mention for sentiment
          (result.llmResponse || ''),
          (result.websitesConsulted || []).join('; '),
          result.error || '',
          '', // No top of mind for sentiment
          0, 0, 0, // No brand counts for sentiment
          result.sentiment || 'neutral',
          result.overallSentimentPercentage || 0,
          result.overallSentiment || 'neutral',
          (result.extractedPositiveKeywords || []).join('; '),
          (result.extractedNegativeKeywords || []).join('; ')
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
        // Visibility results
        const ourBrandCount = result.topOfMind.filter(b => b.type === 'ourbrand').length;
        const competitorCount = result.topOfMind.filter(b => b.type === 'competitor').length; 
        const otherCount = result.topOfMind.filter(b => b.type === 'other').length;
        
        const row = [
          result.category,
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
          (result.websitesConsulted || []).join('; '),
          result.error || '',
          result.topOfMind.map(b => `${b.name}(${b.type})`).join('; '),
          ourBrandCount,
          competitorCount,
          otherCount,
          '', '', '', '', '' // Empty sentiment columns for visibility
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
  if (FILTER_URLS.length > 0) {
    console.log(`- Filter URLs: ${FILTER_URLS.join(', ')}`);
  }
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
  
  // Apply URL filtering if specified
  let companies = allCompanies;
  if (FILTER_URLS.length > 0) {
    companies = allCompanies.filter(company => {
      const companyUrl = company['URL'];
      return FILTER_URLS.some(filterUrl => {
        // Normalize URLs for comparison (remove trailing slashes, protocol differences)
        const normalizedCompanyUrl = companyUrl?.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
        const normalizedFilterUrl = filterUrl.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
        return normalizedCompanyUrl === normalizedFilterUrl;
      });
    });
    console.log(`Filtered to ${companies.length} companies matching specified URLs`);
    if (companies.length === 0) {
      console.error('No companies found matching the specified URLs');
      process.exit(1);
    }
  }
  
  // Apply max companies limit if specified
  if (MAX_COMPANIES > 0) {
    companies = companies.slice(0, MAX_COMPANIES);
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
    const visibilityResults = await runVisibilityTestForCompany(company, competitors);
    
    // Run sentiment tests
    console.log(`\n💭 Running sentiment tests...`);
    const sentimentResults = await runSentimentTestForCompany(company);
    
    // Combine all results
    const allResults = [...visibilityResults, ...sentimentResults];
    
    // Write results immediately to CSV (one row per model per prompt)
    await appendResultsToCSV(company, competitors, allResults);
    
    // Calculate summary stats for display (only for visibility results)
    const stats = calculateSummaryStats(visibilityResults);

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