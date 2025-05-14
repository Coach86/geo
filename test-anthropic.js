require('dotenv').config(); // Load environment variables from .env file

// Since we're testing TypeScript code directly with Node, we need to set up ts-node
require('ts-node/register');

const { Logger } = require('@nestjs/common');
const { AnthropicAdapter } = require('./src/modules/llm/adapters/anthropic.adapter.ts');
const { z } = require('zod');

// Create a minimal schema for testing
const schema = z.object({
  name: z.string(),
  industry: z.string(),
  keyFeatures: z.array(z.string()),
});

// Create simplified config service
const configService = {
  get: (key) => process.env[key]
};

async function main() {
  // Set up logger to capture output
  const logger = new Logger('TestAnthropicAdapter');
  
  // Initialize the adapter
  const anthropicAdapter = new AnthropicAdapter(configService);
  
  if (!anthropicAdapter.isAvailable()) {
    logger.error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    return;
  }
  
  try {
    logger.log('Testing Anthropic adapter structured output...');
    
    // Simple prompt for testing
    const prompt = "Generate a company profile for an AI company called 'NeuralWave'. Include the company name, industry, and 3 key features.";
    
    // Call the getStructuredOutput method
    const result = await anthropicAdapter.getStructuredOutput(prompt, schema, {
      temperature: 0.2,
      model: 'claude-3-sonnet-20240229' // Using a smaller model for testing
    });
    
    // Log the result
    logger.log('Structured output test successful');
    console.log(JSON.stringify(result, null, 2));
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