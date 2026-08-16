import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CatalogSearchQueryDto {
  @ApiPropertyOptional({
    enum: ['TICKETMASTER', 'TMDB'],
    default: 'TICKETMASTER',
    description: 'Fonte do catálogo — shows (Ticketmaster) ou filmes (TMDb)',
  })
  @IsOptional()
  @IsIn(['TICKETMASTER', 'TMDB'])
  source?: 'TICKETMASTER' | 'TMDB' = 'TICKETMASTER';

  @ApiPropertyOptional({
    description: 'Palavra-chave (nome do show/artista, ou do filme)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Cidade (ignorado quando source=TMDB, que não tem venue)',
  })
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
