import { ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use the FRONTEND_URL from Render env vars, fallback to localhost for dev
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  app.enableCors({
    origin: [frontendUrl], // This must match your Vercel URL exactly
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // CRITICAL: Render assigns a dynamic PORT. You MUST use process.env.PORT
  const port = process.env.PORT || 4000;
  
  // Bind to 0.0.0.0 to accept external traffic
  await app.listen(port, '0.0.0.0');
  
  console.log(`Tailor API running on port ${port}/api`);
}
bootstrap();