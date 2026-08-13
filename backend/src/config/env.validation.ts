import { plainToInstance } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUrl, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsUrl({ require_tld: false, protocols: ['postgresql', 'postgres'] })
  DATABASE_URL: string;

  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsNotEmpty()
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

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Variáveis de ambiente inválidas:\n${errors.toString()}`);
  }

  return validatedConfig;
}
