import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';
import { PostHogService } from './modules/analytics/services/posthog.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Enable raw body parsing for webhooks
  });

  // Configure CORS based on environment
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    // In development, allow all origins
    app.enableCors({
      origin: true, // Allow any origin in development
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
      exposedHeaders: 'Content-Disposition',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    // Use single-line log for development
    console.log('CORS enabled with permissive settings for development');
  } else {
    // In production, be more restrictive
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
      credentials: true,
    });
    // Log using single line in production
    if (process.env.NODE_ENV === 'production') {
      // Avoid console.log in production - will be handled by logger
    } else {
      console.log('CORS enabled with restrictive settings for production');
    }
  }

  app.setGlobalPrefix('api', { exclude: ['/'] });


  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('YOMA API')
    .setDescription('API for brand insights and analytics')
    .setVersion('1.0')
    .addTag('Admin - Auth', 'Admin Auth endpoints - Requires admin JWT authentication')
    .addTag('Admin - Batch Processing', 'Admin Batch Processing endpoints - Requires admin JWT authentication')
    .addTag('Admin - Configuration', 'Admin Configuration endpoints - Requires admin JWT authentication')
    .addTag('Admin - LLM', 'Admin LLM endpoints - Requires admin JWT authentication')
    .addTag('Admin - Organizations', 'Admin Organizations endpoints - Requires admin JWT authentication')
    .addTag('Admin - Plans', 'Admin Plans endpoints - Requires admin JWT authentication')
    .addTag('Admin - Projects', 'Admin Projects endpoints - Requires admin JWT authentication')
    .addTag('Admin - Promotions', 'Admin Promotions endpoints - Requires admin JWT authentication')
    .addTag('Admin - Prompts', 'Admin Prompts endpoints - Requires admin JWT authentication')
    .addTag('Admin - Reports', 'Admin Reports endpoints - Requires admin JWT authentication')
    .addTag('Admin - Users', 'Admin Users endpoints - Requires admin JWT authentication')
    .addTag('User - Auth', 'Auth endpoints - Requires user token authentication')
    .addTag('User - Batch Results', 'Batch Results endpoints - Requires user token authentication')
    .addTag('User - Organization', 'Organization endpoints - Requires user token authentication')
    .addTag('User - Profile', 'Profile endpoints - Requires user token authentication')
    .addTag('User - Projects', 'Projects endpoints - Requires user token authentication')
    .addTag('User - Prompts', 'Prompts endpoints - Requires user token authentication')
    .addTag('User - Reports', 'Reports endpoints - Requires user token authentication')
    .addTag('Public - Auth', 'Public Auth endpoints - No authentication required')
    .addTag('Public - Configuration', 'Public Configuration endpoints - No authentication required')
    .addTag('Public - General', 'Public General endpoints - No authentication required')
    .addTag('Public - Health', 'Public Health endpoints - No authentication required')
    .addTag('Public - Payments', 'Public Payments endpoints - No authentication required')
    .addTag('Public - Plans', 'Public Plans endpoints - No authentication required')
    .addTag('Public - Promotions', 'Public Promotions endpoints - No authentication required')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve static frontend files from the public directory
  const publicPath = join(__dirname, '..', 'public');

  // Create a fallback route for SPA to handle client-side routing
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip API routes and static files
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/static/')) {
      return next();
    }

    // Serve index.html for all other routes for SPA client-side routing
    const indexPath = join(publicPath, 'index.html');

    // Check if index.html exists
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    } else {
      if (isDev) {
        console.warn(`Index file not found at ${indexPath}`);
      }
      return next();
    }
  });

  const port = process.env.PORT || 3000;

  // Only log API keys in development
  if (isDev) {
    console.log('API Keys at startup:');
    console.log('  OPENAI_API_KEY:      ', process.env.OPENAI_API_KEY);
    console.log('  ANTHROPIC_API_KEY:   ', process.env.ANTHROPIC_API_KEY);
    console.log('  PERPLEXITY_API_KEY:  ', process.env.PERPLEXITY_API_KEY);
    console.log('  MISTRAL_API_KEY:     ', process.env.MISTRAL_API_KEY);
  }

  await app.listen(port);
  
  // Use structured single-line log for production
  if (isDev) {
    console.log(`Application is running on: http://localhost:${port}`);
  } else {
    // In production, this will be handled by the logger
    const startupLog = {
      message: 'Application started',
      port: port,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(startupLog));
  }

  // Graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      // Use structured single-line log for production
      if (isDev) {
        console.log(`Received ${signal}, shutting down gracefully...`);
      } else {
        const shutdownLog = {
          message: 'Graceful shutdown initiated',
          signal: signal,
          timestamp: new Date().toISOString()
        };
        console.log(JSON.stringify(shutdownLog));
      }
      
      // Shutdown PostHog to ensure all events are sent
      const postHogService = app.get(PostHogService);
      await postHogService.shutdown();
      
      await app.close();
      process.exit(0);
    });
  });
}

bootstrap();
