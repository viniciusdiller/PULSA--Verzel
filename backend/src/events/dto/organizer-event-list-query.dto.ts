import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class OrganizerEventListQueryDto {
  @ApiPropertyOptional({
    enum: EventStatus,
    description: 'Filtra pelos próprios eventos por status',
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  // Query params sempre chegam como string — sem o @Type, o class-validator
  // recusa "1" com "page must be an integer number" mesmo sendo um inteiro válido.
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}
