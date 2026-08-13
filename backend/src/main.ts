import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = configService.getOrThrow<string>('CORS_ORIGIN');
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Plataforma de Eventos e Ingressos — Elite Dev')
    .setDescription('API da plataforma de eventos e ingressos (Desafio Elite Dev / Verzel)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<string>('PORT') ?? '3333';
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend rodando em http://localhost:${port}/api — Swagger em /api-docs`);
}
bootstrap();
