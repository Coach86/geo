import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

import { AppController } from './controllers/app.controller';
import { ProjectModule } from './modules/project/project.module';
import { PromptModule } from './modules/prompt/prompt.module';
import { LlmModule } from './modules/llm/llm.module';
import { ReportModule } from './modules/report/report.module';
import { BatchModule } from './modules/batch/batch.module';
import { HealthModule } from './modules/health/health.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { PlanModule } from './modules/plan/plan.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { EmailModule } from './modules/email/email.module';
import { getWinstonConfig } from './utils/logger.config';
import { getCloudWatchLoggerConfig } from './utils/cloudwatch-logger.config';
import { LoggerModule } from './utils/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const environment = configService.get<string>('NODE_ENV', 'development');
        const useCloudWatch = configService.get<boolean>('ENABLE_CLOUDWATCH_LOGS', false);
        
        // Use CloudWatch optimized config in production or when explicitly enabled
        if (environment === 'production' || useCloudWatch) {
          return getCloudWatchLoggerConfig(environment, 'brand-insights');
        }
        
        // Use standard config for development
        return getWinstonConfig(environment, 'brand-insights');
      },
    }),
    ThrottlerModule.forRoot([
      {
        // Default rate limit: 200 requests per minute (2x more lenient)
        ttl: 60000, // 1 minute in milliseconds
        limit: 200,
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          process.env.NODE_ENV === 'production'
            ? `mongodb://${configService.get('DB_USER')}:${configService.get('DB_USER_PWD')}@${configService.get('DB_HOST')}:${configService.get('DB_PORT')}/${configService.get('DB_NAME')}?authMechanism=SCRAM-SHA-1`
            : `mongodb://${configService.get('DB_HOST')}:${configService.get('DB_PORT')}/${configService.get('DB_NAME')}`,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ssl: process.env.NODE_ENV === 'production',
        retryWrites: false,
        tlsCAFile: process.env.NODE_ENV === 'production' ? 'global-bundle.pem' : undefined,
        tlsAllowInvalidCertificates: true, // Only use this in development
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      exclude: ['/api/(.*)'],
      serveStaticOptions: {
        cacheControl: true,
        maxAge: 3600000,
        index: ['index.html'],
      },
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    OrganizationModule,
    UserModule,
    ProjectModule,
    PromptModule,
    LlmModule,
    ReportModule,
    BatchModule,
    HealthModule,
    AuthModule,
    AppConfigModule,
    PlanModule,
    AnalyticsModule,
    EmailModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    // Register global JWT guard to protect all routes by default
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Register global throttler guard for rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
