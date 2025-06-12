# Configuration Update Guide

This document describes the configuration changes required after renaming the prompt types.

## Updated Configuration Keys

The following configuration keys have been renamed in `config.json`:

### analyzerConfig

Old keys → New keys:
- `analyzerConfig.spontaneous` → `analyzerConfig.visibility`
- `analyzerConfig.comparison` → `analyzerConfig.competition`  
- Added new key: `analyzerConfig.alignment`

### pipelineLimits

Old keys → New keys:
- `pipelineLimits.spontaneous` → `pipelineLimits.visibility`
- `pipelineLimits.comparison` → `pipelineLimits.competition`
- Added new key: `pipelineLimits.alignment`

## Example Configuration

```json
{
  "analyzerConfig": {
    "visibility": {
      "runsPerModel": 1,
      "fallback": {
        "provider": "Anthropic",
        "model": "claude-3-7-sonnet-20250219"
      },
      "primary": {
        "provider": "OpenAI",
        "model": "gpt-4o"
      }
    },
    "sentiment": {
      "fallback": {
        "provider": "Anthropic",
        "model": "claude-3-7-sonnet-20250219"
      },
      "primary": {
        "provider": "OpenAI",
        "model": "gpt-4o"
      }
    },
    "alignment": {
      "fallback": {
        "provider": "Anthropic",
        "model": "claude-3-7-sonnet-20250219"
      },
      "primary": {
        "provider": "OpenAI",
        "model": "gpt-4o"
      }
    },
    "competition": {
      "fallback": {
        "provider": "Anthropic",
        "model": "claude-3-7-sonnet-20250219"
      },
      "primary": {
        "provider": "OpenAI",
        "model": "gpt-4o"
      }
    }
  },
  "pipelineLimits": {
    "visibility": 150,
    "sentiment": 100,
    "alignment": 80,
    "competition": 80
  }
}
```

## Environment Variables

The following environment variables have also been renamed:
- `VISIBILITY_PROMPTS` (previously SPONTANEOUS_PROMPTS)
- `ALIGNMENT_PROMPTS` (previously ACCURACY_PROMPTS)
- `COMPETITION_PROMPTS` (previously BRAND_BATTLE_PROMPTS or COMPARISON_PROMPTS)

## Important Notes

1. After updating your `config.json` file, ensure all the new keys are present.
2. The application will fail to start if these configuration keys are missing.
3. Run the database migration scripts before starting the application with the new configuration.