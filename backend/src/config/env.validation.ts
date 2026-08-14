import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsUrl({ require_tld: false, protocols: ['postgresql', 'postgres'] })
  DATABASE_URL: string;

  @IsNotEmpty()
  @MinLength(16, {
    message: 'JWT_SECRET precisa ter pelo menos 16 caracteres.',
  })
  JWT_SECRET: string;

  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsNotEmpty()
  @MinLength(16, {
    message: 'QR_SIGNING_SECRET precisa ter pelo menos 16 caracteres.',
  })
  QR_SIGNING_SECRET: string;

  @IsNumberString()
  HOLD_TTL_MINUTES: string;

  @IsOptional()
  TICKETMASTER_API_KEY?: string;

  @IsNotEmpty()
  CORS_ORIGIN: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;
}

// Padrões de secret de exemplo/placeholder que nunca devem chegar a
// produção (ex.: alguém esquece de trocar o valor do .env.example).
const WEAK_SECRET_PATTERNS = [
  'change-me',
  'changeme',
  'troque',
  'secret',
  'password',
  'senha123',
];

function assertProductionSecretsAreStrong(config: EnvironmentVariables) {
  if (config.NODE_ENV !== 'production') {
    return;
  }

  const problems: string[] = [];

  for (const [key, value] of [
    ['JWT_SECRET', config.JWT_SECRET],
    ['QR_SIGNING_SECRET', config.QR_SIGNING_SECRET],
  ] as const) {
    if (value.length < 32) {
      problems.push(`${key} precisa ter pelo menos 32 caracteres em produção.`);
    }
    if (
      WEAK_SECRET_PATTERNS.some((pattern) =>
        value.toLowerCase().includes(pattern),
      )
    ) {
      problems.push(
        `${key} parece um valor de exemplo/placeholder — troque antes de publicar.`,
      );
    }
  }

  if (config.JWT_SECRET === config.QR_SIGNING_SECRET) {
    problems.push(
      'JWT_SECRET e QR_SIGNING_SECRET precisam ser valores diferentes.',
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `Configuração insegura para produção:\n${problems.join('\n')}`,
    );
  }
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Variáveis de ambiente inválidas:\n${errors.toString()}`);
  }

  assertProductionSecretsAreStrong(validatedConfig);

  return validatedConfig;
}
