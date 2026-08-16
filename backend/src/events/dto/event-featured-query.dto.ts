import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class EventFeaturedQueryDto {
  @ApiPropertyOptional({
    enum: ['TICKETMASTER', 'TMDB'],
    description:
      'Filtra a vitrine de destaques por fonte (shows Ticketmaster ou filmes TMDB) — omitido retorna todos os destaques, de qualquer fonte',
  })
  @IsOptional()
  @IsIn(['TICKETMASTER', 'TMDB'])
  source?: 'TICKETMASTER' | 'TMDB';
}
