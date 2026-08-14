import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ValidateTicketDto {
  @ApiProperty({
    description:
      'Conteúdo do QR (JWT lido pela câmera) ou o código curto de 6 dígitos digitado manualmente.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(2000)
  code: string;
}
