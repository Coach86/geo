import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class PostHogService {
  private readonly logger = new Logger(PostHogService.name);
  private posthog: PostHog | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    const host = this.configService.get<string>('POSTHOG_HOST', 'https://app.posthog.com');

    if (apiKey) {
      this.posthog = new PostHog(apiKey, {
        host,
        flushAt: 1, // Flush events immediately in production
        flushInterval: 0, // Disable time-based flushing
      });
      this.logger.log('PostHog analytics initialized');
    } else {
      this.logger.warn('PostHog API key not found - analytics disabled');
    }
  }

  /**
   * Track when a new user is registered
   */
  async trackUserRegistered(
    userId: string,
    email: string,
    properties?: {
      organizationId?: string;
      organizationName?: string;
      registrationMethod?: 'email' | 'google' | 'github';
      referralSource?: string;
    },
  ) {
    if (!this.posthog) return;

    try {
      // Track the event
      this.posthog.capture({
        distinctId: userId,
        event: 'user_registered',
        properties: {
          email,
          timestamp: new Date().toISOString(),
          ...properties,
        },
      });

      // Also identify the user for future tracking
      this.posthog.identify({
        distinctId: userId,
        properties: {
          email,
          createdAt: new Date().toISOString(),
          organizationId: properties?.organizationId,
          organizationName: properties?.organizationName,
        },
      });

      // Ensure events are sent
      await this.posthog.flush();

      this.logger.log(`Tracked user registration for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to track user registration: ${error.message}`, error.stack);
    }
  }

  /**
   * Track when a user logs in
   */
  async trackUserLogin(userId: string, method: 'email' | 'google' | 'github' = 'email') {
    if (!this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: userId,
        event: 'user_logged_in',
        properties: {
          method,
          timestamp: new Date().toISOString(),
        },
      });

      await this.posthog.flush();
    } catch (error) {
      this.logger.error(`Failed to track user login: ${error.message}`, error.stack);
    }
  }

  /**
   * Track when an organization is created
   */
  async trackOrganizationCreated(
    userId: string,
    organizationId: string,
    organizationName: string,
    properties?: Record<string, any>,
  ) {
    if (!this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: userId,
        event: 'organization_created',
        properties: {
          organizationId,
          organizationName,
          timestamp: new Date().toISOString(),
          ...properties,
        },
      });

      await this.posthog.flush();
    } catch (error) {
      this.logger.error(`Failed to track organization creation: ${error.message}`, error.stack);
    }
  }

  /**
   * Track custom events
   */
  async track(userId: string, event: string, properties?: Record<string, any>) {
    if (!this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: userId,
        event,
        properties: {
          timestamp: new Date().toISOString(),
          ...properties,
        },
      });

      await this.posthog.flush();
    } catch (error) {
      this.logger.error(`Failed to track event ${event}: ${error.message}`, error.stack);
    }
  }

  /**
   * Update user properties
   */
  async updateUserProperties(userId: string, properties: Record<string, any>) {
    if (!this.posthog) return;

    try {
      this.posthog.identify({
        distinctId: userId,
        properties,
      });

      await this.posthog.flush();
    } catch (error) {
      this.logger.error(`Failed to update user properties: ${error.message}`, error.stack);
    }
  }

  /**
   * Shutdown PostHog client gracefully
   */
  async shutdown() {
    if (!this.posthog) return;

    try {
      await this.posthog.shutdown();
      this.logger.log('PostHog client shut down gracefully');
    } catch (error) {
      this.logger.error(`Failed to shutdown PostHog: ${error.message}`, error.stack);
    }
  }
}