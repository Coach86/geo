# Mint AI Backend - NestJS API Server

## 🏗️ Architecture Overview

The Mint AI backend is built with NestJS 11, providing a robust, scalable API server for brand intelligence analysis. It follows a modular architecture with clear separation of concerns.

```
backend/
├── src/
│   ├── modules/          # Feature modules
│   │   ├── ai-visibility/    # AI visibility analysis
│   │   ├── analytics/        # PostHog analytics integration
│   │   ├── auth/            # Authentication & authorization
│   │   │   ├── decorators/  # Custom decorators (@PublicRoute, @TokenRoute)
│   │   │   ├── guards/      # Auth guards (JWT, Admin, Token)
│   │   │   └── strategies/  # Passport strategies
│   │   ├── batch/           # Batch processing engine
│   │   ├── config/          # Configuration module
│   │   ├── email/           # Email notifications with React Email
│   │   ├── health/          # Health checks
│   │   ├── llm/             # LLM provider adapters
│   │   ├── organization/    # Multi-tenant organizations
│   │   ├── plan/            # Subscription management (Stripe)
│   │   ├── project/         # Project management
│   │   ├── prompt/          # Prompt engineering
│   │   ├── report/          # Report generation
│   │   └── user/            # User management
│   ├── common/              # Constants (markets)
│   ├── controllers/         # Root controller
│   ├── frontend/            # Legacy React frontend (being migrated)
│   ├── scripts/             # Database seed scripts
│   ├── utils/               # Utilities (logger, retry, URL scraper)
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry
├── scripts/                 # Build & migration scripts
├── public/                  # Static assets
└── test-*.js                # Integration test scripts
```

## 🔧 Core Modules

### Authentication Module (`auth/`)
- JWT-based authentication with Passport.js
- Role-based access control (RBAC)
- Session management with refresh tokens
- OAuth integration support

### Batch Processing Module (`batch/`)
- Weekly scheduled analysis using NestJS Cron
- Multi-LLM orchestration with concurrency control
- Progress tracking via WebSocket
- Error recovery and retry mechanisms

Key services:
- `BrandReportOrchestratorService`: Coordinates multi-LLM analysis
- `BatchService`: Manages batch job lifecycle
- `BatchController`: API endpoints for batch operations

### LLM Module (`llm/`)
Unified interface for multiple AI providers:

```typescript
interface LLMAdapter {
  name: string;
  isAvailable(): boolean;
  generateResponse(prompt: string): Promise<LLMResponse>;
}
```

Supported providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3)
- Google (Gemini Pro)
- Mistral
- Perplexity
- DeepSeek
- Grok
- LLAMA

Features:
- Automatic rate limit handling with exponential backoff
- Provider health checks
- Response caching
- Error standardization

### Project Module (`project/`)
- CRUD operations for brand projects
- Domain validation and enrichment
- Project sharing and permissions
- Analytics tracking

### Report Module (`report/`)
- Report generation from LLM responses
- Historical data aggregation
- Export functionality (PDF, CSV, JSON)
- Report versioning

### Organization Module (`organization/`)
- Multi-tenant architecture
- Organization-level settings
- User invitation system
- Usage tracking and limits

### Plan Module (`plan/`)
- Stripe integration for subscriptions
- Plan enforcement middleware
- Usage metering
- Webhook handling for payment events

### AI Visibility Module (`ai-visibility/`)
- AI-powered visibility analysis
- Brand mention tracking
- Spontaneous citation analysis
- Visibility scoring algorithms

### Analytics Module (`analytics/`)
- PostHog integration for product analytics
- Event tracking and user behavior analysis
- Custom event definitions
- Analytics middleware

### Config Module (`config/`)
- Centralized configuration management
- Environment variable validation
- Configuration schemas
- Dynamic configuration loading

## 📡 API Endpoints

### Authentication
```
POST   /admin/auth/login              # Admin login
POST   /admin/auth/refresh            # Refresh JWT token
POST   /auth/magic-link               # Send magic link (public)
GET    /tokens/validate               # Validate access token
POST   /tokens/generate               # Generate access token
```

### Projects
```
POST   /admin/project                 # Create project
POST   /admin/project/from-url        # Create project from URL
GET    /admin/project                 # List all projects
GET    /admin/project/:projectId      # Get project by ID
PATCH  /admin/project/:projectId      # Update project
DELETE /admin/project/:projectId      # Delete project
POST   /projects/:projectId/run-analysis  # Trigger analysis (token auth)
```

### Reports
```
GET    /brand-reports/project/:projectId     # Get project reports (token auth)
GET    /brand-reports/:reportId              # Get specific report
GET    /brand-reports/:reportId/explorer     # Get explorer data
GET    /brand-reports/:reportId/visibility   # Get visibility data
GET    /brand-reports/:reportId/sentiment    # Get sentiment data
GET    /brand-reports/:reportId/alignment    # Get alignment data
GET    /brand-reports/:reportId/competition  # Get competition data
```

### Batch Processing
```
POST   /admin/batch/run                           # Trigger batch run
POST   /admin/batch/process/:projectId            # Process specific project
POST   /admin/batch/orchestrate/:projectId        # Orchestrate all batches
POST   /admin/batch/pipeline/visibility/:projectId   # Run visibility pipeline
POST   /admin/batch/pipeline/sentiment/:projectId    # Run sentiment pipeline
POST   /admin/batch/pipeline/competition/:projectId  # Run competition pipeline
POST   /admin/batch/pipeline/alignment/:projectId    # Run alignment pipeline
GET    /admin/batch-executions/:id                   # Get batch execution
GET    /admin/batch-executions?projectId=            # Get project executions
```

### Organizations
```
POST   /admin/organizations                    # Create organization
GET    /admin/organizations                    # List organizations
GET    /admin/organizations/:id                # Get organization
PATCH  /admin/organizations/:id                # Update organization
PATCH  /admin/organizations/:id/plan-settings  # Update plan settings
PATCH  /admin/organizations/:id/selected-models # Update AI models
DELETE /admin/organizations/:id                # Delete organization
```

### Plans/Subscriptions
```
POST   /admin/plans                           # Create plan
GET    /admin/plans                           # List plans
GET    /admin/plans/stripe-products           # Get Stripe products
POST   /admin/plans/:id/create-checkout-session # Create checkout
GET    /admin/plans/:id                       # Get plan
PATCH  /admin/plans/:id                       # Update plan
DELETE /admin/plans/:id                       # Delete plan
GET    /public/stripe/verify-checkout         # Verify checkout (token auth)
POST   /public/stripe/webhook                 # Stripe webhooks
```

### User Management
```
# Admin routes
POST   /admin/users                           # Create user
GET    /admin/users                           # List users
GET    /admin/users/:id                       # Get user
PATCH  /admin/users/:id                       # Update user
DELETE /admin/users/:id                       # Delete user

# User profile routes (token auth)
GET    /user/profile                          # Get profile
PATCH  /user/profile/phone                    # Update phone
PATCH  /user/profile/email                    # Update email
GET    /user/profile/available-models         # Get available AI models
PATCH  /user/profile/selected-models          # Update selected models
```

### Additional Endpoints
```
# LLM Management
GET    /admin/llm/available-adapters          # List available LLM adapters
POST   /admin/llm/direct-test                 # Test LLM with prompt

# Prompt Management  
GET    /admin/prompt-set/:projectId           # Get project prompts
PATCH  /admin/prompt-set/:projectId           # Update prompts
POST   /admin/prompt-set/:projectId/regenerate # Regenerate prompts
GET    /admin/prompt-set/templates/:projectId # Get prompt templates

# Health Check
GET    /healthz                               # Application health status
```

## 🔐 Authentication Types

The API uses three different authentication mechanisms:

### 1. Admin Authentication (JWT)
- Routes prefixed with `/admin/*`
- Protected by `JwtAuthGuard` and `AdminGuard`
- Requires admin login via `/admin/auth/login`
- JWT tokens stored in HTTP-only cookies

### 2. Token Authentication
- Routes decorated with `@TokenRoute()`
- Uses access tokens generated via magic link flow
- Tokens passed in `Authorization` header or query param
- Used for public-facing API endpoints

### 3. Public Routes
- Routes decorated with `@PublicRoute()`  
- No authentication required
- Examples: `/auth/magic-link`, `/healthz`

## 🔌 WebSocket Events

The backend uses Socket.IO for real-time communication:

### WebSocket Gateways
- **batch-events** - Real-time batch processing updates
- **user-notifications** - User notification system

### Client → Server Events
```typescript
// Authentication
socket.emit('authenticate', { token: string });

// Subscribe to batch updates
socket.emit('subscribe-batch', { batchId: string });

// Unsubscribe from batch updates
socket.emit('unsubscribe-batch', { batchId: string });
```

### Server → Client Events
```typescript
// Batch processing updates
socket.emit('batch-update', {
  batchId: string,
  status: 'processing' | 'completed' | 'failed',
  progress: number,
  currentStep: string,
  details: object
});

// User notifications
socket.emit('notification', {
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string,
  data?: object
});

// Error events
socket.emit('error', {
  code: string,
  message: string,
  details?: object
});
```

## 🗄️ Database Schema

### Collections

#### Users
```javascript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  firstName: string,
  lastName: string,
  organizationId: ObjectId,
  role: 'owner' | 'admin' | 'member',
  createdAt: Date,
  updatedAt: Date
}
```

#### Organizations
```javascript
{
  _id: ObjectId,
  name: string,
  planId: ObjectId,
  stripeCustomerId: string,
  settings: {
    weeklyReportDay: number,
    emailNotifications: boolean
  },
  usage: {
    projectsCount: number,
    reportsCount: number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Projects
```javascript
{
  _id: ObjectId,
  organizationId: ObjectId,
  name: string,
  domain: string,
  brandDescription: string,
  targetAudience: string[],
  competitors: string[],
  settings: {
    analysisTypes: string[],
    llmProviders: string[]
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Reports
```javascript
{
  _id: ObjectId,
  projectId: ObjectId,
  batchId: ObjectId,
  type: 'alignment' | 'competition' | 'sentiment' | 'visibility',
  llmProvider: string,
  data: {
    scores: object,
    insights: string[],
    recommendations: string[]
  },
  metadata: {
    processingTime: number,
    promptTokens: number,
    completionTokens: number
  },
  createdAt: Date
}
```

## 🚀 Development

### Prerequisites
- Node.js 20 LTS
- MongoDB 6.0+
- Redis (optional, for caching)

### Environment Variables
```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/mintai

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
MISTRAL_API_KEY=...
PERPLEXITY_API_KEY=...
DEEPSEEK_API_KEY=...
GROK_API_KEY=...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@mintai.com

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Analytics
POSTHOG_API_KEY=...

# Rate Limiting
LLM_MAX_RETRIES=8
LLM_BASE_DELAY_MS=5000
LLM_MAX_DELAY_MS=180000
LLM_BACKOFF_FACTOR=3.0

# Batch Processing
BATCH_CONCURRENCY=3
BATCH_CRON_EXPRESSION=0 0 * * 0
```

### Running the Server

```bash
# Install dependencies
npm install

# Development with hot reload (includes frontend webpack)
npm run start:dev

# Production build (backend + frontend)
npm run build
npm run start:prod

# Run tests
npm test
npm run test:e2e
npm run test:cov

# Linting and formatting
npm run lint
npm run format

# Database scripts
npm run create:admin           # Create admin user
npm run migrate:organizations  # Migrate to organizations
npm run normalize:urls         # Normalize project URLs
```

### Database Scripts & Migrations

```bash
# Migration scripts (in scripts/ directory)
node scripts/migrate-batch-results.js      # Migrate batch results
node scripts/migrate-prompt-sets.js        # Migrate prompt sets
ts-node scripts/migrate-to-organizations.ts # Migrate to multi-tenant
ts-node scripts/normalize-project-urls.ts   # Normalize URLs

# Seed scripts
node scripts/seed-free-plan.js             # Seed free plan data

# Admin management
ts-node scripts/create-admin-user.ts       # Create admin user
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Scripts
```bash
# Integration test scripts
node test-free-plan.js          # Test free plan functionality
node test-project-deletion.js   # Test project deletion
node test-mistral-websearch.js  # Test Mistral web search  
node test-google-grounding.js   # Test Google grounding

# Brand insight test
npm run test:brand-insight      # Run brand insight test
```

## 🔒 Security

### Authentication Flow
1. User logs in with email/password
2. Server validates credentials
3. Server issues JWT access token (15min) and refresh token (30d)
4. Client includes JWT in Authorization header
5. Server validates JWT on each request
6. Client refreshes token before expiration

### API Security
- Rate limiting per IP and user
- Request validation with class-validator
- SQL injection prevention with Mongoose
- XSS protection with helmet
- CORS configuration
- API versioning

### Data Security
- Passwords hashed with bcrypt (10 rounds)
- Sensitive data encryption at rest
- HTTPS enforced in production
- Environment variables for secrets
- Regular security audits

## 📊 Monitoring

### Health Checks
```
GET /health          # Basic health check
GET /health/db       # Database connectivity
GET /health/llm      # LLM provider status
GET /health/ready    # Readiness probe
```

### Logging
- Winston for structured logging
- Log levels: error, warn, info, debug
- Request/response logging
- Error tracking with Sentry
- Performance monitoring with APM

### Metrics
- Request duration
- LLM API latency
- Database query performance
- WebSocket connections
- Background job statistics

## 🚢 Deployment

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main"]
```

### AWS ECS
- Fargate for serverless containers
- Application Load Balancer
- Auto-scaling based on CPU/memory
- CloudWatch for logs
- Parameter Store for secrets

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
- Build Docker image
- Run tests
- Push to ECR
- Update ECS service
- Run smoke tests
```

## 🛠️ Troubleshooting

### Common Issues

1. **LLM Provider Errors**
   - Check API key validity
   - Verify rate limits
   - Review retry configuration

2. **Database Connection**
   - Verify MongoDB URI
   - Check network connectivity
   - Review connection pool settings

3. **WebSocket Issues**
   - Check CORS configuration
   - Verify Socket.IO version compatibility
   - Review nginx/ALB configuration

4. **Memory Leaks**
   - Monitor heap usage
   - Review event listener cleanup
   - Check for circular dependencies

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [OpenAI API Reference](https://platform.openai.com/docs/)