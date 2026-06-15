import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:4000"];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400,
  });

  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === "production",
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global prefix
  app.setGlobalPrefix("api");

  // Health endpoint (bypasses global prefix)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get("/health", (req, res) => {
    res.json({
      status: "ok",
      version: process.env.APP_VERSION || "1.0.0",
      demoMode: process.env.DEMO_MODE === "true",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 SmartCampus AI API running on port ${port}`);
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   API:    http://localhost:${port}/api`);
  console.log(`   Demo:   ${process.env.DEMO_MODE === "true" ? "ENABLED" : "DISABLED"}`);
}
bootstrap();
