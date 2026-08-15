import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  // Avisos de cancelamento de evento que o cliente ainda não viu — a UI
  // mostra isso como uma tela de desculpas logo que a pessoa loga.
  findPending(userId: string) {
    return this.prisma.eventCancellationNotice.findMany({
      where: { userId, acknowledgedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Só marca como visto os avisos que realmente pertencem a quem está
  // pedindo — sem isso, alguém poderia "silenciar" o aviso de outra
  // pessoa só adivinhando o id.
  async acknowledge(userId: string, ids: string[]): Promise<void> {
    await this.prisma.eventCancellationNotice.updateMany({
      where: { id: { in: ids }, userId, acknowledgedAt: null },
      data: { acknowledgedAt: new Date() },
    });
  }
}
