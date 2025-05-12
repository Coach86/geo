# Testing with Real LLM API Keys

This guide explains how to test the Brand Insight Service with real LLM API keys.

## Setting Up API Keys

The application supports multiple LLM providers. You need to add your API keys to the `.env` file for the providers you want to use. Providers with missing or empty API keys will be automatically disabled.

```
# LLM API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
GROK_API_KEY=your-grok-key
MISTRAL_API_KEY=your-mistral-key
PERPLEXITY_API_KEY=your-perplexity-key
LLAMA_API_KEY=your-llama-key
DEEPSEEK_API_KEY=your-deepseek-key
```

### Where to Get API Keys

- **OpenAI (ChatGPT)**: https://platform.openai.com/api-keys
- **Anthropic (Claude)**: https://console.anthropic.com/settings/keys
- **Google (Gemini)**: https://aistudio.google.com/app/apikey
- **Grok**: https://grok.x.ai (API access may be limited)
- **Mistral**: https://console.mistral.ai/api-keys/
- **Perplexity**: https://docs.perplexity.ai/docs/getting-started
- **Llama**: Various providers have Llama 3 available through APIs

## Testing Available LLM Adapters

To check which LLM adapters are available with your current API keys, you can use either of the following methods:

### Method 1: Manual (separate terminals)

```bash
# Start the server if it's not already running
npm run start:dev

# In another terminal, run the LLM adapter test
npm run test:llm
```

### Method 2: Automated (single command)

For a more reliable test that handles starting and stopping the server automatically:

```bash
# This runs the server and test in a single command
npm run test:llm:auto
```

This command:
1. Stops any existing server on port 3001
2. Builds the application
3. Starts the server on port 3001
4. Runs the LLM adapter test
5. Shuts down the server when done

Both methods will show you which LLM providers are currently active based on the API keys you've provided.

## Testing the Full Flow

To test the complete flow including identity card creation and batch processing:

```bash
# Start the server
npm run start:dev

# Test identity card creation
npm run test:identity

# Test batch process (requires database setup)
npm run test:batch
```

## Notes on LLM Integration

- The system automatically disables LLM providers with missing or empty API keys
- The batch process will use all available LLM providers
- Each LLM provider has appropriate rate limiting applied through the `p-limit` library
- You can control the concurrency limit in the `.env` file with the `CONCURRENCY_LIMIT` setting

## API Endpoints for Testing

- `GET /api/v1/llm/available-adapters`: Check which LLM adapters are currently available
- `POST /api/v1/profile`: Create a company identity card
- `GET /api/v1/reports/:companyId/latest`: Get the latest report for a company