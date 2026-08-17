import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'organizador@elitedev.dev' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsNotEmpty()
  @MinLength(6)
  // bcrypt ignora tudo depois do byte 72 — sem limite aqui, alguém podia
  // mandar uma senha de vários KB só pra fazer o bcrypt.compare/hash
  // gastar CPU à toa a cada tentativa (o limite global de 1mb no corpo da
  // requisição, em main.ts, já evita algo muito maior que isso).
  @MaxLength(128)
  password: string;
}
