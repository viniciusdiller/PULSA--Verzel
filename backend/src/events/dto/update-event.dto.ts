import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateSectionDto } from './create-event.dto';
import { EVENTS_LIMITS } from '../events.constants';

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Descrição atualizada do evento.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'Av. Principal, 1000' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venueAddress?: string;

  @ApiPropertyOptional({ example: 'Music' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({
    type: [CreateSectionDto],
    description:
      'Substitui todos os setores/assentos do evento. Só é aceito se o evento ainda não tiver nenhuma reserva — inclui rascunhos que já tiveram holds cancelados/expirados.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(EVENTS_LIMITS.MIN_SECTIONS)
  @ArrayMaxSize(EVENTS_LIMITS.MAX_SECTIONS)
  @ValidateNested({ each: true })
  @Type(() => CreateSectionDto)
  sections?: CreateSectionDto[];
}
