import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CatalogSearchQueryDto {
  @ApiPropertyOptional({ description: 'Palavra-chave (nome do show/artista)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    default: 0,
    description: 'Página (0-based, conforme a API do Ticketmaster)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  page?: number = 0;
}
