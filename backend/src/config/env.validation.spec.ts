import { validateEnv } from './env.validation';

function baseConfig(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL:
      'postgresql://postgres:postgres@localhost:5432/db?schema=public',
    JWT_SECRET: 'dev-only-change-me-jwt-secret',
    QR_SIGNING_SECRET: 'dev-only-change-me-qr-secret',
    HOLD_TTL_MINUTES: '7',
    CORS_ORIGIN: 'http://localhost:3000',
    NODE_ENV: 'development',
    ...overrides,
  };
}

const STRONG_JWT_SECRET = 'a'.repeat(40);
const STRONG_QR_SECRET = 'b'.repeat(40);

describe('validateEnv', () => {
  it('aceita uma configuração de desenvolvimento válida', () => {
    expect(() => validateEnv(baseConfig())).not.toThrow();
  });

  it('rejeita quando DATABASE_URL está ausente', () => {
    const config = baseConfig();
    delete config.DATABASE_URL;

    expect(() => validateEnv(config)).toThrow();
  });

  it('rejeita DATABASE_URL com protocolo inválido', () => {
    expect(() =>
      validateEnv(
        baseConfig({ DATABASE_URL: 'mysql://user:pass@localhost:3306/db' }),
      ),
    ).toThrow();
  });

  it('rejeita JWT_SECRET curto demais (menos de 16 caracteres)', () => {
    expect(() => validateEnv(baseConfig({ JWT_SECRET: 'curto' }))).toThrow();
  });

  it('rejeita QR_SIGNING_SECRET curto demais', () => {
    expect(() =>
      validateEnv(baseConfig({ QR_SIGNING_SECRET: 'curto' })),
    ).toThrow();
  });

  it('rejeita HOLD_TTL_MINUTES não numérico', () => {
    expect(() =>
      validateEnv(baseConfig({ HOLD_TTL_MINUTES: 'sete' })),
    ).toThrow();
  });

  it('rejeita NODE_ENV com valor fora do enum permitido', () => {
    expect(() => validateEnv(baseConfig({ NODE_ENV: 'staging' }))).toThrow();
  });

  describe('regras extras quando NODE_ENV=production', () => {
    it('rejeita secrets com menos de 32 caracteres em produção mesmo passando no mínimo de 16', () => {
      expect(() =>
        validateEnv(
          baseConfig({
            NODE_ENV: 'production',
            JWT_SECRET: 'a'.repeat(20),
            QR_SIGNING_SECRET: 'b'.repeat(20),
          }),
        ),
      ).toThrow(/pelo menos 32 caracteres/);
    });

    it('rejeita secrets que parecem placeholder mesmo sendo longos', () => {
      expect(() =>
        validateEnv(
          baseConfig({
            NODE_ENV: 'production',
            JWT_SECRET: `change-me-${'a'.repeat(30)}`,
            QR_SIGNING_SECRET: STRONG_QR_SECRET,
          }),
        ),
      ).toThrow(/placeholder/);
    });

    it('rejeita quando JWT_SECRET e QR_SIGNING_SECRET são iguais', () => {
      expect(() =>
        validateEnv(
          baseConfig({
            NODE_ENV: 'production',
            JWT_SECRET: STRONG_JWT_SECRET,
            QR_SIGNING_SECRET: STRONG_JWT_SECRET,
          }),
        ),
      ).toThrow(/precisam ser valores diferentes/);
    });

    it('aceita em produção quando os dois secrets são fortes e diferentes', () => {
      expect(() =>
        validateEnv(
          baseConfig({
            NODE_ENV: 'production',
            JWT_SECRET: STRONG_JWT_SECRET,
            QR_SIGNING_SECRET: STRONG_QR_SECRET,
            CORS_ORIGIN: 'https://elitedev.example.com',
          }),
        ),
      ).not.toThrow();
    });

    it('não aplica as regras extras de força quando NODE_ENV é development', () => {
      expect(() =>
        validateEnv(
          baseConfig({
            NODE_ENV: 'development',
            JWT_SECRET: 'dev-only-change-me-jwt-secret',
            QR_SIGNING_SECRET: 'dev-only-change-me-qr-secret',
          }),
        ),
      ).not.toThrow();
    });
  });
});
