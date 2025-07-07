# Page Intelligence Standalone Script - LLM Integration

This document explains how the standalone page intelligence script integrates with LLMs to match the real system's behavior.

## Overview

The standalone script now supports LLM-based analysis for:
1. **Page Categorization** - Uses LLMs to accurately categorize pages into types (homepage, product pages, guides, etc.)
2. **Semantic Rule Analysis** - Some rules use LLMs for deeper content understanding

## Configuration

To enable LLM support, set one or more of these environment variables in your `.env` file:

```env
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key  
GOOGLE_API_KEY=your-google-ai-key
```

## How It Works

### 1. Page Categorization

The `PageCategorizerService` uses LLMs to categorize pages:
- Quick URL-based categorization for obvious cases (homepage, error pages)
- LLM analysis for accurate categorization of content pages
- Returns category type, confidence score, and analysis level

Categories include:
- HOMEPAGE, PRODUCT_PAGES, SERVICE_PAGES
- BLOG_POSTS, GUIDES_TUTORIALS, FAQ_PAGES
- CASE_STUDIES, TOOLS_CALCULATORS, ABOUT_US
- And more...

### 2. LLM-Enabled Rules

Currently, the **In-Depth Guides** rule uses LLM for semantic analysis:

**Without LLM (Basic Scoring):**
- Word count analysis
- Heading structure
- Media element count
- URL pattern matching

**With LLM (Enhanced Scoring):**
- All basic scoring PLUS:
- Table of contents detection (+10 points)
- Guide type classification (ultimate/complete guide +10 points)
- Practical examples detection (+5 points)
- Internal/external linking analysis (+5 points)
- Topic coverage and entity analysis
- Comprehensiveness assessment
- Industry focus detection

## Performance Impact

With LLMs enabled:
- Initial page categorization: ~1-3 seconds per page
- LLM-enabled rules: ~2-5 seconds per rule
- Total analysis time increases but provides much more accurate scoring

## Testing LLM Integration

Run the test script to verify LLM integration:

```bash
node scripts/test-llm-integration.js
```

This will:
1. Initialize LLM clients
2. Test page categorization
3. Test LLM-enabled rule evaluation
4. Show detailed results

## Fallback Behavior

The system gracefully handles LLM failures:
- If primary LLM provider fails, it tries fallback providers
- If all LLMs fail, rules fall back to basic scoring
- Page categorization falls back to URL-based patterns

## Provider Priority

1. **OpenAI** (gpt-4o-mini) - Primary, fast and cost-effective
2. **Anthropic** (claude-3-haiku) - Secondary fallback
3. **Google** (gemini-1.5-flash) - Tertiary fallback

## Running the Main Script

The main script automatically detects LLM availability:

```bash
# With LLMs (if API keys are set)
node scripts/test-page-intelligence-standalone.js

# The script will show:
# ✓ OpenAI API configured
# ✓ Anthropic API configured  
# ✓ Google AI API configured
# Some rules will use LLM for enhanced analysis

# Without LLMs
# ⚠ No LLM API keys configured
# Rules will use basic analysis only
```

## Cost Considerations

LLM usage is optimized for cost:
- Uses fast, cheap models (gpt-4o-mini, claude-3-haiku, gemini-1.5-flash)
- Content is truncated to reasonable lengths
- Structured outputs minimize token usage
- Caching prevents re-analysis of same pages

## Extending LLM Support

To add LLM support to more rules:

1. Create an LLM-enabled version of the rule
2. Import required LLM SDKs
3. Add `hasLLMSupport()` method
4. Implement `analyzewithLLM()` method
5. Update rule engine to use LLM version when available

See `in-depth-guides-llm.rule.js` for a complete example.

## Troubleshooting

**No LLM clients initialized:**
- Check that API keys are set in `.env` file
- Verify keys are valid and have credits

**LLM analysis fails:**
- Check console for specific error messages
- Verify network connectivity
- Rules will fall back to basic scoring

**Slow performance:**
- Normal with LLMs enabled (adds 2-5 seconds per page)
- Consider reducing `--max-pages` parameter
- Use `--parallel` to process multiple pages concurrently