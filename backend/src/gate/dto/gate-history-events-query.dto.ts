import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 8;
}
