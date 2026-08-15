import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Novo Nome' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório quando `newPassword` é enviado.',
  })
  @ValidateIf((dto: UpdateProfileDto) => !!dto.newPassword)
  @IsString()
  @MinLength(6)
  currentPassword?: string;

  @ApiPropertyOptional({ description: 'Nova senha (mínimo 6 caracteres).' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}
