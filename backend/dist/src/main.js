"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const corsOrigin = configService.getOrThrow('CORS_ORIGIN');
    app.enableCors({
        origin: [corsOrigin, 'http://localhost:3000'],
        credentials: true,
    });
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('Plataforma de Eventos e Ingressos — Elite Dev')
        .setDescription('API da plataforma de eventos e ingressos (Desafio Elite Dev / Verzel)')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    const port = configService.get('PORT') ?? '3333';
    await app.listen(port);
    console.log(`Backend rodando em http://localhost:${port}/api — Swagger em /api-docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map