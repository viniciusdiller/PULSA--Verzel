import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GateHistoryEventsQueryDto {
  // Query params sempre chegam como string — sem o @Type, o class-validator
  // recusa "1" com "page must be an integer number" mesmo sendo um inteiro
  // válido (mesmo bug já corrigido em outros DTOs de paginação do projeto).
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 4;

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
