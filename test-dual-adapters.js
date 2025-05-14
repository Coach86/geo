require('dotenv').config();
require('ts-node/register');

const { Logger } = require('@nestjs/common');
const { AnthropicAdapter } = require('./src/modules/llm/adapters/anthropic.adapter.ts');
const { AnthropicLangChainAdapter } = require('./src/modules/llm/adapters/anthropic-langchain.adapter.ts');
const { z } = require('zod');

// Create a minimal schema for testing
const schema = z.object({
  name: z.string(),
  industry: z.string(),
  competitors: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

// Create simplified config service
const configService = {
  get: (key) => process.env[key]
};

async function main() {
  const logger = new Logger('TestDualAdapters');
  
  // Initialize the adapters
  const anthropicDirectSDK = new AnthropicAdapter(configService);
  const anthropicLangChain = new AnthropicLangChainAdapter(configService);
  
  if (!anthropicDirectSDK.isAvailable()) {
    logger.error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    return;
  }
  
  try {
    logger.log('Testing dual adapter approach...');
    
    // 1. Test the Direct SDK adapter for Q&A with web search
    logger.log('\n--- Testing Direct SDK Adapter (Q&A with web search) ---');
    const qaPrompt = "What are the latest developments in generative AI as of 2025? List 3 key advancements in the last 6 months.";
    
    const qaResult = await anthropicDirectSDK.call(qaPrompt, {
      model: 'claude-3-7-sonnet-20250219',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: "Search the web when you need current information. Provide brief but comprehensive answers."
    });
    
    logger.log('Direct SDK Q&A Result:');
    logger.log(`Model: ${qaResult.modelVersion}`);
    logger.log(`Used Web Search: ${qaResult.usedWebSearch ? 'Yes' : 'No'}`);
    if (qaResult.toolUsage && qaResult.toolUsage.length > 0) {
      logger.log(`Web Search Queries: ${qaResult.toolUsage.map(t => 
        t.parameters && t.parameters.query ? t.parameters.query : 'Unknown').join(', ')}`);
    }
    console.log('\nText Response:');
    console.log(qaResult.text);
    
    // 2. Test the LangChain adapter for structured output
    logger.log('\n--- Testing LangChain Adapter (Structured Output) ---');
    
    try {
      // This should fail as we removed structured output from the direct SDK
      await anthropicDirectSDK.getStructuredOutput("Generate a profile for Tesla", schema);
    } catch (error) {
      logger.log('Direct SDK correctly throws error for structured output: ' + error.message);
    }
    
    // Now try with the LangChain adapter
    const structuredPrompt = "Generate a company profile for Tesla. Include the company name, industry, top 3 competitors, 3 key strengths, and 2 key weaknesses.";
    
    const structuredResult = await anthropicLangChain.getStructuredOutput(structuredPrompt, schema, {
      model: 'claude-3-7-sonnet-20250219', 
      temperature: 0.2,
      maxTokens: 2000
    });
    
    logger.log('LangChain Structured Output Result:');
    console.log(JSON.stringify(structuredResult, null, 2));
    
    logger.log('\nTest completed successfully!');
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});