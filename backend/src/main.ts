import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';

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
    console.log('CORS enabled with permissive settings for development');
  } else {
    // In production, be more restrictive
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
      credentials: true,
    });
    console.log('CORS enabled with restrictive settings for production');
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
    .addTag('brand-insights')
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
      console.warn(`Index file not found at ${indexPath}`);
      return next();
    }
  });

  const port = process.env.PORT || 3000;

  console.log('API Keys at startup:');
  console.log('  OPENAI_API_KEY:      ', process.env.OPENAI_API_KEY);
  console.log('  ANTHROPIC_API_KEY:   ', process.env.ANTHROPIC_API_KEY);
  console.log('  PERPLEXITY_API_KEY:  ', process.env.PERPLEXITY_API_KEY);
  console.log('  MISTRAL_API_KEY:     ', process.env.MISTRAL_API_KEY);

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
