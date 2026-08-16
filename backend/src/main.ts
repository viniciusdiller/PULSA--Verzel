import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // API pura (sem HTML de terceiros), então CSP/COEP restritivos do Helmet
  // não têm o que proteger aqui e só atrapalhariam a UI do Swagger — mas os
  // outros headers do Helmet (HSTS, X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy etc.) continuam ativos.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Necessário para o Throttler (e qualquer coisa baseada em req.ip) enxergar
  // o IP real do cliente atrás do proxy reverso do Render, em vez do IP
  // interno do load balancer — sem isso o rate-limit fica por IP único.
  app.set('trust proxy', 1);

  app.use(json({ limit: '1mb' }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );

  const corsOrigin = configService.getOrThrow<string>('CORS_ORIGIN');
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000'],
    // Autenticação é via header Authorization (localStorage), não cookie —
    // não há necessidade de credentials cross-site aqui.
    credentials: false,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Plataforma de Eventos e Ingressos — Elite Dev')
    .setDescription(
      'API da plataforma de eventos e ingressos (Desafio Elite Dev / Verzel)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<string>('PORT') ?? '3333';
  await app.listen(port);

  console.log(
    `Backend rodando em http://localhost:${port}/api — Swagger em /api-docs`,
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Falha ao inicializar o backend:', error);
  process.exit(1);
});
