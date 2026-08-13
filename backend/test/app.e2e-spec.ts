import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// e2e leve, propositalmente sem banco real: cobre só o roteamento/pipes
// HTTP de ponta a ponta (algo que testes unitários não pegam). A lógica de
// negócio em si é coberta por testes unitários com o Prisma mockado — não
// faz sentido este e2e exigir um Postgres real só para validar que o
// health endpoint responde 200 e que o guard global bloqueia rota protegida.
describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        user: { findUnique: jest.fn() },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health responde 200 sem exigir autenticação', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string; timestamp: string };
        expect(body.status).toBe('ok');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  it('GET /api/auth/me (rota protegida) sem token responde 401', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('POST /api/auth/login com corpo inválido (email malformado) responde 400', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nao-e-um-email', password: '123456' })
      .expect(400);
  });

  it('POST /api/auth/login rejeita campos extras não esperados no DTO (whitelist/forbidNonWhitelisted)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@a.com', password: '123456', role: 'ORGANIZER' })
      .expect(400);
  });
});
