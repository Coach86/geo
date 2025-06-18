# Mint AI Frontend - Next.js 15 Application

## 🎨 Overview

The Mint AI frontend is a modern, responsive web application built with Next.js 15 (App Router), React 18, and TypeScript. It provides an intuitive interface for brand intelligence analysis and insights visualization.

## 🏗️ Architecture

```
frontend/
├── app/                    # Next.js App Router
│   ├── (protected)/       # Authenticated routes
│   │   ├── home/         # Dashboard home
│   │   ├── alignment/    # Alignment analysis
│   │   ├── competition/  # Competition analysis
│   │   ├── sentiment/    # Sentiment analysis
│   │   ├── visibility/   # Visibility tracking
│   │   └── settings/     # User settings
│   ├── auth/             # Authentication pages
│   ├── onboarding/       # User onboarding flow
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Layout components
│   ├── shared/          # Shared components
│   └── [feature]/       # Feature-specific
├── hooks/               # Custom React hooks
├── lib/                 # Utilities & API
├── providers/           # Context providers
├── types/               # TypeScript types
└── public/              # Static assets
```

## 🎯 Key Features

### Dashboard
- Real-time analysis progress tracking
- Interactive charts with Recharts
- Historical trend visualization
- Quick actions and shortcuts
- Notification center

### Analysis Views
- **Alignment**: Brand messaging consistency
- **Competition**: Competitor comparison matrix
- **Sentiment**: Emotional response analysis
- **Visibility**: Spontaneous citation tracking

### User Experience
- Responsive design (mobile-first)
- Dark/light theme support
- Real-time updates via WebSocket
- Smooth animations with Framer Motion
- Accessibility (WCAG 2.1 AA compliant)

## 🛠️ Technology Stack

### Core
- **Framework**: Next.js 15.1.2 (App Router)
- **Language**: TypeScript 5
- **React**: 18.3.1
- **Node**: 20 LTS

### UI/UX
- **Styling**: Tailwind CSS 3.4
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Charts**: Recharts

### State & Data
- **State Management**: React Context API
- **Data Fetching**: Native fetch with React hooks
- **Real-time**: Socket.IO Client
- **Forms**: React Hook Form + Zod
- **Caching**: Next.js built-in caching

### Development
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Git Hooks**: Husky
- **Testing**: Jest + React Testing Library

## 📁 Component Structure

### UI Components (`components/ui/`)
Reusable UI primitives from shadcn/ui:
```
button.tsx
card.tsx
dialog.tsx
dropdown-menu.tsx
input.tsx
label.tsx
select.tsx
toast.tsx
...
```

### Layout Components (`components/layout/`)
```
sidebar.tsx         # Main navigation
header.tsx          # Top navigation
footer.tsx          # Footer content
navigation-menu.tsx # Menu items
```

### Feature Components
```
components/
├── alignment/
│   ├── AlignmentChart.tsx
│   ├── AttributeScoresTable.tsx
│   └── InsightsList.tsx
├── competition/
│   ├── CompetitorMatrix.tsx
│   ├── MarketPositioning.tsx
│   └── StrengthsWeaknesses.tsx
├── pricing/
│   ├── PricingCard.tsx
│   ├── PlanComparison.tsx
│   └── SubscriptionManager.tsx
└── shared/
    ├── FeatureLockedWrapper.tsx
    ├── LoadingSpinner.tsx
    └── ErrorBoundary.tsx
```

## 🪝 Custom Hooks

### Core Hooks
```typescript
// Authentication
useAuth() - User authentication state
useUser() - Current user data

// Projects
useProjects() - Project list and CRUD
useProject(id) - Single project data
useProjectSettings() - Project configuration

// Analysis
useReports(projectId) - Analysis reports
useBatchProgress() - Real-time batch status
useAnalysisData(type) - Specific analysis data

// Features
useFeatureAccess() - Feature availability
usePlan() - Current subscription plan
useOrganization() - Organization data

// UI/UX
useTheme() - Theme management
useToast() - Toast notifications
useWindowSize() - Responsive helpers
```

### Example Hook Implementation
```typescript
// hooks/use-projects.ts
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const createProject = useCallback(async (data: CreateProjectDto) => {
    const newProject = await api.createProject(data);
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  return { projects, loading, error, createProject, refetch };
}
```

## 🎨 Styling Guidelines

### Tailwind CSS Classes
```tsx
// Consistent spacing
<div className="p-4 md:p-6 lg:p-8">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Dark mode support
<div className="bg-white dark:bg-gray-900">

// Interactive states
<button className="hover:bg-gray-100 active:bg-gray-200 transition-colors">
```

### Component Variants (CVA)
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## 🔐 Authentication Flow

1. **Login/Register**
   - User submits credentials
   - API validates and returns JWT
   - Token stored in httpOnly cookie
   - User redirected to dashboard

2. **Protected Routes**
   - Middleware checks authentication
   - Redirects to login if unauthorized
   - Refreshes token if expired

3. **Logout**
   - Clear authentication cookies
   - Invalidate session
   - Redirect to login page

## 📡 API Integration

### API Client (`lib/api-client.ts`)
```typescript
class ApiClient {
  private baseURL = process.env.NEXT_PUBLIC_API_URL;

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  // Authentication
  auth = {
    sendMagicLink: (email: string) => 
      this.request('/auth/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  };

  // Projects (with token auth)
  projects = {
    runAnalysis: (projectId: string) => 
      this.request(`/projects/${projectId}/run-analysis`, {
        method: 'POST',
      }),
  };

  // Reports (with token auth)
  reports = {
    getByProject: (projectId: string) => 
      this.request<Report[]>(`/brand-reports/project/${projectId}`),
    get: (reportId: string) => 
      this.request<Report>(`/brand-reports/${reportId}`),
    getAlignment: (reportId: string) => 
      this.request(`/brand-reports/${reportId}/alignment`),
    getCompetition: (reportId: string) => 
      this.request(`/brand-reports/${reportId}/competition`),
    getSentiment: (reportId: string) => 
      this.request(`/brand-reports/${reportId}/sentiment`),
    getVisibility: (reportId: string) => 
      this.request(`/brand-reports/${reportId}/visibility`),
  };

  // User profile
  user = {
    getProfile: () => this.request<User>('/user/profile'),
    updatePhone: (phone: string) => 
      this.request('/user/profile/phone', {
        method: 'PATCH',
        body: JSON.stringify({ phone }),
      }),
  };
}
```

### Real-time Updates (`lib/socket.ts`)
```typescript
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;

  connect() {
    this.socket = io(process.env.NEXT_PUBLIC_WS_URL, {
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    return this.socket;
  }

  joinBatch(batchId: string) {
    this.socket?.emit('batch:join', { batchId });
  }

  onBatchProgress(callback: (data: BatchProgress) => void) {
    this.socket?.on('batch:progress', callback);
  }
}
```

## 🚀 Development

### Prerequisites
- Node.js 20 LTS
- pnpm 8+

### Environment Variables
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3000

# Public Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CHAT_SUPPORT=false
```

### Running the Application

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix

# Testing
pnpm test
pnpm test:watch
pnpm test:coverage
```

## 🧪 Testing

### Unit Tests
```typescript
// components/__tests__/ProjectCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';

describe('ProjectCard', () => {
  it('renders project information', () => {
    const project = {
      id: '1',
      name: 'Test Project',
      domain: 'example.com',
    };

    render(<ProjectCard project={project} />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });
});
```

### Integration Tests
```typescript
// app/__tests__/dashboard.test.tsx
import { render, waitFor } from '@testing-library/react';
import Dashboard from '../(protected)/home/page';
import { mockProjects } from '@/lib/mock-data';

jest.mock('@/hooks/use-projects', () => ({
  useProjects: () => ({
    projects: mockProjects,
    loading: false,
    error: null,
  }),
}));

describe('Dashboard', () => {
  it('displays project list', async () => {
    const { getByText } = render(<Dashboard />);
    
    await waitFor(() => {
      expect(getByText(mockProjects[0].name)).toBeInTheDocument();
    });
  });
});
```

## 📱 Responsive Design

### Breakpoints
```css
/* Tailwind default breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile-First Approach
```tsx
<div className="
  p-4           /* Mobile: small padding */
  md:p-6        /* Tablet: medium padding */
  lg:p-8        /* Desktop: large padding */
">
  <h1 className="
    text-2xl    /* Mobile: smaller heading */
    md:text-3xl /* Tablet: medium heading */
    lg:text-4xl /* Desktop: large heading */
  ">
    Dashboard
  </h1>
</div>
```

## 🎯 Performance Optimization

### Code Splitting
```typescript
// Dynamic imports for heavy components
const ChartComponent = dynamic(
  () => import('@/components/charts/AnalysisChart'),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);
```

### Image Optimization
```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Mint AI"
  width={200}
  height={50}
  priority
  placeholder="blur"
/>
```

### Memoization
```typescript
// Memoize expensive computations
const processedData = useMemo(() => 
  transformAnalysisData(rawData),
  [rawData]
);

// Memoize callbacks
const handleSubmit = useCallback((data: FormData) => {
  submitForm(data);
}, [submitForm]);
```

## 🔒 Security

### Content Security Policy
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://api.mintai.com wss://api.mintai.com;
    `.replace(/\n/g, ''),
  },
];
```

### Input Validation
```typescript
// Using Zod for schema validation
const projectSchema = z.object({
  name: z.string().min(3).max(50),
  domain: z.string().url(),
  description: z.string().max(500).optional(),
});

// In component
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(projectSchema),
});
```

## 🚢 Deployment

### Production Build
```bash
# Build optimization
pnpm build

# Analyze bundle size
pnpm analyze

# Run production server
pnpm start
```

### Vercel Deployment
```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install"
}
```

### Environment Variables
Set in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)