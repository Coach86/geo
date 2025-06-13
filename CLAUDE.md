# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a brand insights service that:
1. Generates company identity cards from URLs or raw data
2. Runs weekly batch jobs to analyze brand mentions, sentiment, and competitor positioning across multiple LLMs
3. Stores and exposes these insights via a REST API

## Technical Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10
- **Database**: MongoDB
- **Infrastructure**: AWS Fargate + ALB
- **CI/CD**: GitHub Actions → ECR → ECS
- **LLM Providers**: OpenAI, Anthropic, Google, DeepSeek, Grok, LLAMA, Mistral, Perplexity

## Architecture

The service is designed as a single-container application that:
- Exposes REST endpoints for identity card creation and report retrieval
- Runs scheduled batch jobs using NestJS's built-in scheduler
- Interfaces with multiple LLM providers through a common adapter interface
- Uses a concurrency limiter to manage LLM API rate limits
- Stores data in MongoDB

## Key Files and Directories

- `src/`: Main application code
  - `app.module.ts`: Main application module
  - `main.ts`: Application entry point
  - `controllers/`: REST endpoint definitions
  - `services/`: Business logic components
  - `modules/`: NestJS feature modules
    - `identity-card/`: Identity card generation
    - `llm/`: LLM providers adapter layer
    - `prompt/`: Prompt generation and management
    - `report/`: Report generation and retrieval
    - `batch/`: Weekly batch job
    - `health/`: Health check endpoints
  - `utils/`: Utility functions and helpers
- `test-*.js`: Test scripts for different application features

## Testing Scripts

The repository includes automated test scripts that can run the server and tests in a single command:

```bash
# Test which LLM adapters are available based on API keys
npm run test:llm:auto

# Test creating a company identity card
npm run test:identity:auto

# Test the batch processing functionality
npm run test:batch:auto
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm run start:prod

# Run Docker development environment
docker compose -f docker-compose.dev.yml up
```

## LLM Testing

To test the LLM adapters:

1. Add your API keys to the `.env` file:
   ```
   OPENAI_API_KEY=your-key
   ANTHROPIC_API_KEY=your-key
   GOOGLE_API_KEY=your-key
   PERPLEXITY_API_KEY=your-key
   # ... other providers
   ```

2. Run the LLM adapter test to check which providers are active:
   ```
   npm run test:llm:auto
   ```

See `LLM_TESTING.md` for more details.

## Rate Limiting and Retry Logic

The application includes built-in retry logic for handling rate limiting errors from LLM providers:

### Configuration

Retry behavior can be configured via environment variables:

```env
LLM_MAX_RETRIES=7           # Maximum number of retries (default: 7)
LLM_BASE_DELAY_MS=3000      # Base delay in milliseconds (default: 3000)
LLM_MAX_DELAY_MS=120000     # Maximum delay in milliseconds (default: 120000)
LLM_BACKOFF_FACTOR=2.5      # Exponential backoff factor (default: 2.5)
```

### How It Works

1. **Rate Limit Detection**: Automatically detects rate limiting errors based on:
   - HTTP 429 status codes
   - Error messages containing keywords like "rate limit", "quota exceeded", "too many requests"
   - Retry-After headers or retry delay information in error responses

2. **Exponential Backoff**: Uses exponential backoff with jitter to spread out retry attempts:
   - First retry: 3 seconds (+ jitter)
   - Second retry: 7.5 seconds (+ jitter)
   - Third retry: 18.75 seconds (+ jitter)
   - Fourth retry: 46.88 seconds (+ jitter)
   - Fifth retry: 117.19 seconds (+ jitter)
   - Sixth retry: 120 seconds (capped at max)
   - Seventh retry: 120 seconds (capped at max)
   - Maximum delay: 120 seconds (2 minutes)

3. **Provider-Specific Delays**: If the API provider specifies a retry delay in the error response, that delay is respected instead of the exponential backoff.

4. **Comprehensive Logging**: All retry attempts are logged with details about delays and error messages.

### Supported Providers

The retry logic works with all LLM providers and automatically handles rate limiting from:
- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)
- Perplexity
- Other providers that return standard rate limiting errors

## Implementation Status

The implementation has completed the following milestones:

1. ✅ Repository Skeleton
2. ✅ Core Domain Models
3. ✅ Identity-Card Endpoint
4. ✅ Async Prompt-Generation Worker
5. ✅ LLM Adapter Layer
6. ✅ Weekly Cron Batch (Implemented but needs testing)
7. ✅ Report Retrieval Endpoint
8. ✅ Logging & Health

## Port Configuration

The application uses the `PORT` environment variable to determine which port to listen on. The default is 3000.

When running tests, we use specific ports to avoid conflicts:
- Main development server: 3000
- LLM test: 3001
- Identity card test: 3002
- Batch test: 3003

## Documentation

- `README.md`: Project overview and getting started
- `TESTING.md`: Testing instructions
- `LLM_TESTING.md`: Guide for testing with real LLM API keys

## Typescript rules
- No implicit any authorized

## Project changes
- Always try to build the project at the end of task implementation

## CODE GUIDELINES
- **Files should not have more than 300 lines, consider breaking it into multiple files**
- YOU NEVER NEVER USE any for typing.

## REACT FRONTEND BEST PRACTICES

### File Architecture
```
frontend/
├── app/                      # Next.js 13+ app directory
│   ├── (protected)/         # Route groups for authenticated routes
│   ├── auth/                # Authentication pages
│   └── layout.tsx           # Root layout
├── components/              
│   ├── ui/                  # Shadcn/ui components (Button, Card, etc.)
│   ├── layout/              # Layout components (Sidebar, Header, etc.)
│   ├── shared/              # Shared components across features
│   └── [feature]/           # Feature-specific components
├── hooks/                   # Custom React hooks
├── lib/                     # Utility functions and API clients
├── providers/               # React Context providers
├── types/                   # TypeScript type definitions
└── utils/                   # Helper functions
```

### Component Structure Best Practices
1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Use component composition to build complex UIs
3. **Generic Components**: Create reusable components for common patterns (e.g., EditableList)
4. **Props Interface**: Always define TypeScript interfaces for component props
5. **File Naming**: Use PascalCase for components (e.g., `ProjectCard.tsx`)

### Custom Hooks Guidelines
1. **Naming Convention**: Always prefix with `use` (e.g., `useAuth`, `useProjects`)
2. **Single Purpose**: Each hook should handle one specific piece of logic
3. **Return Consistent API**: Return objects with clear property names
4. **Error Handling**: Include error states in hook returns
5. **Loading States**: Include loading states when dealing with async operations

Example:
```typescript
interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProjects(): UseProjectsReturn {
  // Implementation
}
```

### State Management
1. **Local State First**: Use `useState` for component-specific state
2. **Context for Cross-Cutting Concerns**: Use React Context for auth, theme, navigation
3. **Avoid Prop Drilling**: Use Context or component composition instead
4. **Server State**: Use React Query or SWR for server state management

### Component Patterns
1. **Container/Presentational**: Separate data fetching from UI rendering
2. **Compound Components**: For related components (e.g., Card, CardHeader, CardContent)
3. **Render Props**: When you need to share logic between components
4. **Higher-Order Components**: Sparingly, prefer hooks instead

### Performance Optimization
1. **Memoization**: Use `React.memo` for expensive components
2. **useMemo/useCallback**: For expensive computations and stable references
3. **Code Splitting**: Use dynamic imports for large components
4. **Virtualization**: For long lists (react-window or react-virtualized)

### TypeScript Best Practices
1. **No `any` Types**: Always define proper types
2. **Interface over Type**: Prefer interfaces for object shapes
3. **Const Assertions**: Use `as const` for literal types
4. **Generic Components**: Use generics for reusable components
5. **Discriminated Unions**: For components with multiple states

### Styling Guidelines
1. **Tailwind CSS**: Use utility classes for styling
2. **Component Variants**: Use cva (class-variance-authority) for variants
3. **Consistent Spacing**: Use Tailwind's spacing scale
4. **Dark Mode**: Support both light and dark themes
5. **Responsive Design**: Mobile-first approach

### Testing Strategy
1. **Unit Tests**: For utility functions and hooks
2. **Component Tests**: Using React Testing Library
3. **Integration Tests**: For user workflows
4. **E2E Tests**: For critical paths (using Playwright/Cypress)

### API Integration
1. **Centralized API Clients**: Keep all API calls in `lib/` directory
2. **Error Handling**: Consistent error handling across all API calls
3. **Type Safety**: Define types for all API responses
4. **Authentication**: Handle auth tokens consistently

### Form Handling
1. **React Hook Form**: For complex forms
2. **Validation**: Use Zod for schema validation
3. **Error Messages**: Clear, user-friendly error messages
4. **Loading States**: Show loading indicators during submission 