import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Reservation, Ticket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateSerial,
  generateShareSlug,
  signTicketQr,
} from './utils/ticket-signing.util';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // Roda dentro da MESMA transação da aprovação do pagamento (Reservations
  // module) — o ingresso só pode existir se a reserva realmente foi paga,
  // e vice-versa.
  async issueForReservation(
    tx: Prisma.TransactionClient,
    reservation: Reservation,
  ): Promise<Ticket> {
    const secret = this.configService.getOrThrow<string>('QR_SIGNING_SECRET');

    const ticketId = randomUUID();
    const serial = generateSerial();
    const shareSlug = generateShareSlug();
    const qrToken = signTicketQr(
      { ticketId, eventId: reservation.eventId, serial },
      secret,
    );

    return tx.ticket.create({
      data: {
        id: ticketId,
        reservationId: reservation.id,
        eventId: reservation.eventId,
        seatId: reservation.seatId,
        ownerId: reservation.customerId,
        serial,
        qrToken,
        shareSlug,
      },
    });
  }

  async findMine(ownerId: string) {
    return this.prisma.ticket.findMany({
      where: { ownerId },
      include: { event: true, seat: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Rota pública (link de compartilhamento) — devolve só o necessário
  // pra mostrar o QR e os dados do evento na porta; não inclui e-mail
  // nem qualquer outro dado pessoal do dono do ingresso.
  async findByShareSlug(shareSlug: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { shareSlug },
      include: { event: true, seat: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.');
    }

    const { ownerId, ...publicFields } = ticket;
    void ownerId; // extraído só para excluí-lo da resposta pública
    return publicFields;
  }
}
