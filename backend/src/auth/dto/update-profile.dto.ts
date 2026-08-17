import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Novo Nome' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório quando `newPassword` é enviado.',
  })
  @ValidateIf((dto: UpdateProfileDto) => !!dto.newPassword)
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword?: string;

  @ApiPropertyOptional({ description: 'Nova senha (mínimo 6 caracteres).' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword?: string;
}
