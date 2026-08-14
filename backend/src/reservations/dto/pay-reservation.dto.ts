import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PayReservationDto {
  @ApiProperty({
    example: '4242 4242 4242 4242',
    description:
      'Cartão de teste. 4242 4242 4242 4242 sempre aprova; 4000 0000 0000 0002 sempre recusa; qualquer outro número Luhn-válido aprova/recusa pelo último dígito.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(13)
  @MaxLength(24)
  cardNumber: string;
}
