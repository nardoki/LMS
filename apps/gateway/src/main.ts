import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? process.env.GATEWAY_PORT ?? 3000);

  const rawOrigins = process.env.CORS_ORIGIN;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3100',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3100',
      ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow server-to-server, mobile, or curl requests with no origin
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MasteryLMS API Gateway')
    .setDescription('Public REST API Gateway for MasteryLMS')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  Logger.log(`gateway HTTP listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger docs available at http://localhost:${port}/docs`, 'Bootstrap');
}

void bootstrap();
