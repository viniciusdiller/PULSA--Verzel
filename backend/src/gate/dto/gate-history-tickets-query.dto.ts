import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GateHistoryTicketsQueryDto {
  // Query params sempre chegam como string — sem o @Type, o class-validator
  // recusa "1" com "page must be an integer number" mesmo sendo um inteiro
  // válido (mesmo bug já corrigido em outros DTOs de paginação do projeto).
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Dobra como o "certo número de ingressos" que dispara a paginação por
  // evento na tela de histórico da portaria.
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}
