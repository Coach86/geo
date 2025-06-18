# Mint AI - Brand Intelligence Platform

![Mint AI](./frontend/public/mint-logo.svg)

## 🚀 Overview

Mint AI is a comprehensive brand intelligence platform that leverages multiple AI models to provide deep insights into brand perception, competitive positioning, and market sentiment. The platform automatically analyzes brand mentions across various LLMs and provides actionable insights through an intuitive dashboard.

## 🎯 Key Features

- **Multi-LLM Brand Analysis**: Analyze brand perception across OpenAI, Anthropic, Google, Mistral, Perplexity, and more
- **Automated Weekly Reports**: Scheduled batch processing for continuous brand monitoring
- **Four Analysis Types**:
  - **Alignment**: How well your brand messaging aligns with market perception
  - **Competition**: Comparative analysis against competitors
  - **Sentiment**: Overall sentiment and emotional response to your brand
  - **Visibility**: Brand awareness and spontaneous citation tracking
- **Real-time Processing**: WebSocket-based live updates during analysis
- **Multi-tenant SaaS**: Organization-based architecture with role-based access
- **Flexible Pricing**: Free tier with paid Pro and Enterprise plans

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Next.js 15   │────▶│    NestJS 11    │────▶│    MongoDB      │
│    Frontend     │     │    Backend      │     │    Database     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        
         │                       ▼                        
         │              ┌─────────────────┐              
         │              │   LLM Adapters  │              
         │              │  (OpenAI, etc)  │              
         │              └─────────────────┘              
         │                       │                        
         └───────────────────────┘                        
              WebSocket Connection
```

## 🛠️ Technology Stack

### Backend
- **Framework**: NestJS 11 with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport.js
- **Real-time**: Socket.IO
- **Task Scheduling**: NestJS Cron
- **Email**: Resend with React Email
- **Infrastructure**: AWS Fargate + ALB

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State Management**: React Context API
- **Forms**: React Hook Form + Zod
- **Payments**: Stripe
- **Analytics**: PostHog

### LLM Providers
- OpenAI (GPT-4)
- Anthropic (Claude)
- Google (Gemini)
- Mistral
- Perplexity
- DeepSeek
- Grok
- LLAMA

## 🚀 Quick Start

### Prerequisites
- Node.js 20 LTS
- MongoDB 6.0+
- npm or pnpm
- Docker (optional)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/mint-ai.git
cd mint-ai
```

2. Set up environment variables:
```bash
# Backend (.env)
cp backend/.env.example backend/.env

# Frontend (.env.local)
cp frontend/.env.example frontend/.env.local
```

3. Configure your API keys in the `.env` files:
```env
# LLM Providers
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key
# ... other providers

# Database
MONGODB_URI=mongodb://localhost:27017/mintai

# Authentication
JWT_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=your-key
STRIPE_WEBHOOK_SECRET=your-secret
```

### Development Setup

#### Option 1: Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && pnpm install

# Start MongoDB (if not using cloud)
mongod

# Start backend (port 3000)
cd backend && npm run start:dev

# Start frontend (port 3001)
cd frontend && pnpm dev
```

#### Option 2: Docker Development

```bash
docker-compose -f docker-compose.dev.yml up
```

### Running Tests

```bash
# Test LLM providers
cd backend && npm run test:llm:auto

# Test identity card generation
npm run test:identity:auto

# Test batch processing
npm run test:batch:auto

# Run all tests
npm test
```

## 📁 Project Structure

```
mint-ai/
├── backend/              # NestJS backend application
│   ├── src/
│   │   ├── modules/     # Feature modules
│   │   ├── main.ts      # Application entry point
│   │   └── app.module.ts
│   ├── scripts/         # Database scripts
│   └── test-*.js        # Test scripts
│
├── frontend/            # Next.js frontend application
│   ├── app/            # App Router pages
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and API clients
│   └── providers/      # Context providers
│
├── docs/               # Documentation
├── docker-compose.yml  # Production Docker config
└── README.md          # This file
```

## 🔧 Development Workflow

### Backend Development
1. Create new modules in `backend/src/modules/`
2. Follow NestJS conventions for controllers, services, and DTOs
3. Add new LLM providers in `backend/src/modules/llm/adapters/`
4. Run `npm run lint` before committing

### Frontend Development
1. Create pages in `frontend/app/` following Next.js App Router conventions
2. Add reusable components to `frontend/components/`
3. Use TypeScript strictly (no `any` types)
4. Follow the component structure guidelines in `CLAUDE.md`

### Git Workflow
1. Create feature branches from `main`
2. Make atomic commits with clear messages
3. Run tests before pushing
4. Create pull requests for review

## 📊 Features in Detail

### Brand Analysis Engine
- Generates comprehensive brand reports across multiple AI models
- Compares brand perception across different LLMs
- Tracks spontaneous brand mentions
- Provides actionable insights and recommendations

### Dashboard Features
- Real-time analysis progress tracking
- Interactive charts and visualizations
- Historical trend analysis
- Export reports in multiple formats
- Email notifications for completed reports

### Subscription Management
- **Free Plan**: Limited features with blur overlay
- **Pro Plan**: Full access to all features
- **Enterprise Plan**: Custom limits and dedicated support
- Stripe integration for payments
- Usage tracking and limits enforcement

## 🚢 Deployment

### Production Build

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
pnpm build
pnpm start
```

### Docker Deployment

```bash
docker-compose up -d
```

### AWS Deployment
The application is designed to run on AWS Fargate with:
- Application Load Balancer
- ECS Service
- MongoDB Atlas for database
- S3 for static assets
- CloudWatch for logging

## 📝 API Documentation

The backend exposes a RESTful API with the following main endpoints:

### Public/User Endpoints
- `POST /auth/magic-link` - Send magic link for authentication
- `GET /user/profile` - Get authenticated user profile
- `POST /projects/:projectId/run-analysis` - Trigger analysis for a project
- `GET /brand-reports/project/:projectId` - Get reports for a project
- `GET /brand-reports/:reportId` - Get specific report details

### Admin Endpoints
- `POST /admin/auth/login` - Admin authentication
- `POST /admin/project` - Create new project
- `GET /admin/project` - List all projects
- `POST /admin/batch/run` - Manually trigger batch processing
- `GET /admin/organizations` - Manage organizations

### WebSocket Events
- `batch-events` - Real-time batch processing updates
- `user-notifications` - User notification system

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- Documentation: See `/docs` directory
- Issues: GitHub Issues
- Email: support@mintai.com

## 🔗 Links

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [API Reference](./docs/api-reference.md)
- [Deployment Guide](./docs/deployment.md)