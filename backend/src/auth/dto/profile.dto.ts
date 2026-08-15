import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class ProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  createdAt: Date;

  // Uma métrica real por papel, calculada dos próprios dados do usuário —
  // não é enfeite: CUSTOMER vê quantos ingressos já tem, ORGANIZER quantos
  // eventos já publicou, GATE_STAFF quantas validações já fez.
  @ApiProperty({ description: 'Métrica relevante pro papel do usuário.' })
  statsCount: number;

  @ApiProperty()
  statsLabel: string;
}
