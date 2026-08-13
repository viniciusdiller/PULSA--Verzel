import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsHexColor,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EVENTS_LIMITS } from '../events.constants';

export class CreateSectionDto {
  @ApiProperty({ example: 'Plateia A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 15000, description: 'Preço do setor em centavos' })
  @IsInt()
  @Min(0)
  @Max(100_000_00)
  priceCents: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(EVENTS_LIMITS.MIN_ROWS)
  @Max(EVENTS_LIMITS.MAX_ROWS)
  rowsCount: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(EVENTS_LIMITS.MIN_SEATS_PER_ROW)
  @Max(EVENTS_LIMITS.MAX_SEATS_PER_ROW)
  seatsPerRow: number;

  @ApiProperty({ example: '#D4A73A', required: false })
  @IsOptional()
  @IsHexColor()
  colorHex?: string;
}

export class CreateEventDto {
  @ApiProperty({ example: 'Turnê Nacional 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Show especial de encerramento de turnê.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ example: '2026-12-20T22:00:00.000Z' })
  @IsISO8601()
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: 'Arena Verzel' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  venueName: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  venueCity: string;

  @ApiProperty({ example: 'Av. Principal, 1000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  venueAddress: string;

  @ApiProperty({
    example: 'vvG1zZ9CfJt7A',
    description: 'ID do evento no catálogo externo',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  externalId: string;

  @ApiProperty({ example: 'TICKETMASTER', required: false })
  @IsOptional()
  @IsString()
  externalSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  externalRaw?: Record<string, unknown>;

  @ApiProperty({ type: [CreateSectionDto] })
  @IsArray()
  @ArrayMinSize(EVENTS_LIMITS.MIN_SECTIONS)
  @ArrayMaxSize(EVENTS_LIMITS.MAX_SECTIONS)
  @ValidateNested({ each: true })
  @Type(() => CreateSectionDto)
  sections: CreateSectionDto[];
}
