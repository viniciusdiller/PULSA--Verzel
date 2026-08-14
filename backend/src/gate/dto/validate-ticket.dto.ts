import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ValidateTicketDto {
  @ApiProperty({
    description:
      'Conteúdo do QR (lido pela câmera) ou o mesmo código digitado manualmente.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  code: string;
}
