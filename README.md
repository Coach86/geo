# Brand Insight Service

A single-container Node.js service that analyzes brands by:

- Generating Company Identity Cards from URLs or raw data via REST API
- Running weekly insight batches across multiple LLMs (Claude, ChatGPT, Gemini, DeepSeek, Grok, LLAMA)
- Measuring brand sentiment, factual accuracy, and competitor positioning
- Exposing insights via REST API

## Features

- Identity Card Generation: Create structured company profiles from website URLs
- Multi-LLM Analysis: Query various LLMs to gather diverse perspectives
- Scheduled Insights: Automatically run weekly analysis batches
- Comprehensive Metrics:
  - Spontaneous citations detection
  - Direct brand sentiment and factual accuracy
  - Brand vs. competitor positioning

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10
- **Database**: PostgreSQL/SQLite (via Prisma ORM)
- **Infrastructure**: AWS Fargate + ALB
- **Scheduling**: @nestjs/schedule for cron jobs
- **LLM Providers**: OpenAI, Anthropic, Google, DeepSeek, Grok, LLAMA, Mistral, Perplexity

## Getting Started

### Prerequisites

- Node.js 20.x
- Docker and Docker Compose (optional)
- PostgreSQL (optional, SQLite for local development)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client, run migrations and build the app
npm run setup

# Start development server
npm run start:dev
```

### Testing the Application

We've included several testing options to verify the functionality of the application.
For detailed testing instructions, see [TESTING.md](TESTING.md).

Quick start:

```bash
# Automated testing (handles server startup/shutdown)
npm run test:llm:auto     # Test available LLM adapters
npm run test:identity:auto # Test identity card creation
npm run test:batch:auto   # Test batch processing
npm run test:all          # Run all tests in sequence

# Or run the simple test with manual server management
npm run start:dev
npm run test:simple
```

For testing with real LLM API keys, see [LLM_TESTING.md](LLM_TESTING.md).

### API Endpoints

- `POST /api/v1/profile` - Generate a company identity card
- `GET /api/v1/reports/:companyId/latest` - Get latest brand report
- `GET /healthz` - Health check endpoint

## Development

For development, you can use:

```bash
# Run database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Explore the database with Prisma Studio
npm run prisma:studio

# Run tests
npm test
```

## License

MIT
EOF < /dev/null