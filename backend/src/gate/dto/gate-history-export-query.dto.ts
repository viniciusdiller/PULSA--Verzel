import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GateHistoryExportQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtra pelo nome do evento, ignorando maiúsculas e espaços nas bordas',
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    return typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  })
  search?: string;
}
