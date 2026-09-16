import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // FRONTEND_URL restricts CORS to your actual deployed frontend (e.g. your
  // Vercel URL) in production. Left unset, it falls back to localhost for
  // local dev. Supports a comma-separated list if you have more than one
  // frontend origin (e.g. a preview deployment plus production).
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // whitelist: true strips any request-body fields not declared on the DTO
  // (e.g. someone slipping a `roles` field into a register request body);
  // transform: true lets class-validator's @IsNumber()/@IsMongoId() etc.
  // actually run against the incoming JSON. Without this pipe, DTOs are
  // decorative — nothing enforces them.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  // Render assigns PORT dynamically; binding to 0.0.0.0 (rather than the
  // implicit default) ensures the server accepts traffic from outside the
  // container, which some platforms require explicitly.
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Tailor API running on port ${port}/api`);
}
bootstrap();
