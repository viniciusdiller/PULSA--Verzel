import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class EventListQueryDto {
  @ApiPropertyOptional({ description: 'Busca por título do evento' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Filtro por cidade do local' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  // Query params sempre chegam como string — sem o @Type, o class-validator
  // recusa "1" com "page must be an integer number" mesmo sendo um inteiro
  // válido (mesmo bug já corrigido em OrganizerEventListQueryDto).
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
