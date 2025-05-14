import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

import { AppController } from './controllers/app.controller';
import { IdentityCardModule } from './modules/identity-card/identity-card.module';
import { PromptModule } from './modules/prompt/prompt.module';
import { LlmModule } from './modules/llm/llm.module';
import { ReportModule } from './modules/report/report.module';
import { BatchModule } from './modules/batch/batch.module';
import { HealthModule } from './modules/health/health.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
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
    ThrottlerModule.forRoot(), // Default configuration
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
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api*'],
      serveStaticOptions: {
        cacheControl: true,
        maxAge: 3600000,
        index: false, // Don't serve index.html automatically
      },
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    UserModule,
    IdentityCardModule,
    PromptModule,
    LlmModule,
    ReportModule,
    BatchModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}