import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // FRONTEND_URL restricts CORS to your actual deployed frontend (e.g. your
  // Vercel URL) in production. Left unset, it falls back to allowing any
  // origin, which is fine for local development but should be set once
  // deployed. Supports a comma-separated list if you have more than one
  // frontend origin (e.g. a preview deployment plus production).
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim());
  app.enableCors({ origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Tailor API running on http://localhost:${port}/api`);
}
bootstrap();
