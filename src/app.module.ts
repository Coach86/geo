import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';

import { CoreModule } from './services/core.module';
import { AppController } from './controllers/app.controller';
import { IdentityCardModule } from './modules/identity-card/identity-card.module';
import { PromptModule } from './modules/prompt/prompt.module';
import { LlmModule } from './modules/llm/llm.module';
import { ReportModule } from './modules/report/report.module';
import { BatchModule } from './modules/batch/batch.module';
import { HealthModule } from './modules/health/health.module';
import { getWinstonConfig } from './utils/logger.config';

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
        return getWinstonConfig(environment, 'brand-insights');
      },
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CoreModule,
    IdentityCardModule,
    PromptModule,
    LlmModule,
    ReportModule,
    BatchModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}