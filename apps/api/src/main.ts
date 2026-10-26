import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

function validateProductionSecrets() {
  if (process.env.NODE_ENV === 'production') {
    const accessSecret =
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const internalApiKey = process.env.INTERNAL_API_KEY;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    const insecureDefaults = [
      'sc-ai-access-secret-dev-only',
      'refresh-secret-dev-only',
      'sc-internal-service-key-dev-only',
      'dev-encryption-key-32-bytes-long!!',
      'change-me',
      'secret',
    ];

    if (!accessSecret || insecureDefaults.includes(accessSecret) || accessSecret.length < 16) {
      throw new Error(
        'FATAL: Insecure or missing JWT access secret (JWT_ACCESS_SECRET or JWT_SECRET) in production (must be >= 16 chars).',
      );
    }
    if (!refreshSecret || insecureDefaults.includes(refreshSecret) || refreshSecret.length < 16) {
      throw new Error(
        'FATAL: Insecure or missing JWT refresh secret (JWT_REFRESH_SECRET) in production (must be >= 16 chars).',
      );
    }
    if (!internalApiKey || insecureDefaults.includes(internalApiKey) || internalApiKey.length < 16) {
      throw new Error(
        'FATAL: Insecure or missing internal service API key (INTERNAL_API_KEY) in production (must be >= 16 chars).',
      );
    }
    if (!encryptionKey || insecureDefaults.includes(encryptionKey) || encryptionKey.length < 16) {
      throw new Error(
        'FATAL: Insecure or missing encryption key (ENCRYPTION_KEY) in production (must be >= 16 chars).',
      );
    }
  }
}

async function bootstrap() {
  validateProductionSecrets();
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:4000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-api-key'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  });

  app.use(cookieParser());

  // HTTP security headers
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global prefix
  app.setGlobalPrefix('api');

  // Health endpoint (supports both /health and /api/health)
  const httpAdapter = app.getHttpAdapter();
  const sendHealth = (req: any, res: any) => {
    res.json({
      status: 'ok',
      version: process.env.APP_VERSION || '1.0.0',
      demoMode: process.env.DEMO_MODE === 'true',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  };
  httpAdapter.get('/health', sendHealth);
  httpAdapter.get('/api/health', sendHealth);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 SmartCampus AI API running on port ${port}`);
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   API:    http://localhost:${port}/api`);
  console.log(
    `   Demo:   ${process.env.DEMO_MODE === 'true' ? 'ENABLED' : 'DISABLED'}`,
  );
}
bootstrap();
