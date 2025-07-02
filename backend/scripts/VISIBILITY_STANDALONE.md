# Standalone Visibility Pipeline Testing Script

## Overview

This is a completely standalone version of the visibility testing script that doesn't require the full NestJS application context or MongoDB connection. It directly calls LLM APIs to test brand visibility.

## Features

- **No database dependency**: Runs without MongoDB connection
- **Direct LLM API calls**: Uses native SDK clients for each provider
- **Multi-provider support**: Tests across OpenAI, Anthropic, Google, Mistral, and more
- **Automatic competitor discovery**: Uses LLM to discover competitors (same as main app)
- **Exact prompt matching**: Uses the same visibility analyzer prompts as production
- **Comprehensive results**: Detailed output including discovered competitors

## Prerequisites

1. **Install dependencies**:
   ```bash
   npm install csv-parser csv-writer dotenv
   npm install openai @anthropic-ai/sdk @google/generative-ai @mistralai/mistralai
   ```

2. **Set API keys in `.env` file**:
   ```env
   # Required for analysis (GPT-4o)
   OPENAI_API_KEY=your-openai-key
   
   # Additional models (set keys for the ones you want to test)
   ANTHROPIC_API_KEY=your-anthropic-key      # Claude 3.7 & Claude 4 Sonnet
   GOOGLE_API_KEY=your-google-key            # Gemini 2.0 Flash
   MISTRAL_API_KEY=your-mistral-key          # Mistral Medium 2025
   PERPLEXITY_API_KEY=your-perplexity-key    # Perplexity Sonar Pro
   XAI_API_KEY=your-x-ai-key                 # Grok 3 Latest
   DEEPSEEK_API_KEY=your-deepseek-key        # DeepSeek Chat
   ```

   **Important**: OpenAI API key is required for analyzing responses. Other keys are optional based on which models you want to test.

## Usage

```bash
node scripts/test-visibility-standalone.js [number_of_runs] [parallel_limit]
```

### Parameters
- `number_of_runs` (optional): Number of times to run each test. Default: 5
- `parallel_limit` (optional): Number of parallel API calls. Default: 10

### Examples

Run with defaults (5 runs, 10 parallel):
```bash
node scripts/test-visibility-standalone.js
```

Run with 10 iterations, 10 parallel calls:
```bash
node scripts/test-visibility-standalone.js 10
```

Run with 10 iterations, 20 parallel calls (faster):
```bash
node scripts/test-visibility-standalone.js 10 20
```

Run with 5 iterations, 50 parallel calls (much faster but watch rate limits):
```bash
node scripts/test-visibility-standalone.js 5 50
```

## Supported Models

The script tests the following models (matching config.json enabled models):

- **OpenAI**: GPT-4o
- **Anthropic**: Claude 3.7 Sonnet, Claude 4 Sonnet  
- **Google**: Gemini 2.0 Flash
- **Mistral**: Mistral Medium 2025
- **Perplexity**: Sonar Pro
- **X.AI**: Grok 3 Latest
- **DeepSeek**: DeepSeek Chat

## How It Works

1. **Competitor discovery**: First discovers competitors using Perplexity or GPT-4o (with web search)
2. **Direct LLM calls**: For each visibility prompt, calls all configured LLM models
3. **Response analysis**: Uses GPT-4o with the exact production prompts to analyze brand mentions
4. **Multi-model testing**: Tests each prompt across all available models in parallel
5. **Results aggregation**: Calculates average scores and aggregates brand mentions

## Output

Creates a comprehensive CSV file with:
- Company information (name, URL, market, language)
- **Discovered Competitors**: List of competitors found by LLM
- Average visibility scores
- Competitor average scores
- Per-run results showing which brands were found
- Brand mention counts
- Lists of unique competitors mentioned
- Lists of all unique brands mentioned

## Advantages

- **No build required**: Runs without building the TypeScript code
- **No database needed**: Perfect for isolated testing
- **Simpler setup**: Just needs API keys and npm packages
- **Easier debugging**: Direct API calls are easier to troubleshoot

## Performance Optimization

### Parallel Execution
The script now supports parallel API calls to dramatically improve performance:

- **Default**: 10 parallel calls (safe for most API rate limits)
- **Recommended**: 20-30 parallel calls for good balance
- **Maximum**: 50+ parallel calls (monitor for rate limit errors)

### Execution Time Estimates
With 7 models, 5 prompts per company, and 5 runs:
- **Sequential**: ~175 seconds per company
- **10 parallel**: ~18 seconds per company
- **20 parallel**: ~9 seconds per company
- **50 parallel**: ~4 seconds per company

### Rate Limiting Considerations
Different providers have different rate limits:
- **OpenAI**: 500 RPM (requests per minute) for GPT-4o
- **Anthropic**: 50 RPM for Claude models
- **Google**: 60 RPM for Gemini
- **Mistral**: Varies by plan
- **Perplexity**: 50 RPM for Sonar Pro

Adjust the `parallel_limit` based on your API tier and the number of models you're testing.

## Troubleshooting

1. **API key errors**: Ensure your keys are correctly set in the `.env` file
2. **Rate limit errors**: Increase the delay between API calls
3. **Module not found**: Run `npm install` to install all dependencies
4. **JSON parsing errors**: The analysis step expects valid JSON - check the LLM responses