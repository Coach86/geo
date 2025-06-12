# PostHog Backend Setup

## Configuration

Add the following environment variables to your `.env` file:

```env
# PostHog Analytics (Optional)
POSTHOG_API_KEY=your_posthog_project_api_key
POSTHOG_HOST=https://app.posthog.com  # or https://eu.posthog.com for EU instance
```

## Events Tracked

The backend automatically tracks the following events:

1. **user_registered** - When a new user registers for the first time
   - Properties: email, organizationId, organizationName, registrationMethod, timestamp

2. **organization_created** - When a new organization is created
   - Properties: organizationId, organizationName, timestamp

3. **user_logged_in** - When a user successfully logs in (can be tracked from backend)
   - Properties: method, timestamp

## Implementation Details

- PostHog is integrated through the `AnalyticsModule` 
- Events are sent immediately (flushAt: 1)
- If no API key is provided, analytics are disabled gracefully
- The service logs all tracking activities for debugging

## Getting Your PostHog API Key

1. Sign up for PostHog at https://posthog.com
2. Create a new project
3. Go to Project Settings → API Keys
4. Copy your Project API Key (not Personal API Key)

## Usage in Code

The PostHogService is automatically injected where needed. Currently implemented in:
- UserService: Tracks new user registrations and organization creation

To add tracking to other services:

```typescript
import { PostHogService } from '../analytics/services/posthog.service';

constructor(
  // ... other services
  private postHogService: PostHogService,
) {}

// Track custom event
await this.postHogService.track(userId, 'custom_event', {
  property1: 'value1',
  property2: 'value2',
});
```