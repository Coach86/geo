import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostHogService } from './services/posthog.service';

@Module({
  imports: [ConfigModule],
  providers: [PostHogService],
  exports: [PostHogService],
})
export class AnalyticsModule {}