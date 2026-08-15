import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class PayReservationDto {
  @ApiPropertyOptional({
    description:
      'Se true, abate o saldo da plataforma do cliente do total antes de cobrar o cartão. Se o saldo cobrir tudo, o cartão nem é necessário.',
  })
  @IsOptional()
  @IsBoolean()
  useBalance?: boolean;

  @ApiProperty({
    example: '4242 4242 4242 4242',
    description:
      'Cartão de teste. 4242 4242 4242 4242 sempre aprova; 4000 0000 0000 0002 sempre recusa; qualquer outro número Luhn-válido aprova/recusa pelo último dígito. Opcional só quando o saldo (useBalance) cobre o valor inteiro — o serviço valida isso, já que a DTO sozinha não sabe o saldo do cliente.',
    required: false,
  })
  @ValidateIf((dto: PayReservationDto) => !dto.useBalance)
  @IsString()
  @IsNotEmpty()
  @MinLength(13)
  @MaxLength(24)
  cardNumber?: string;
}
