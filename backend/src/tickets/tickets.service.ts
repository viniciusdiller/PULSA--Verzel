import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Reservation, Ticket } from '@prisma/client';
import {
  generateSerial,
  generateShareSlug,
  signTicketQr,
} from './utils/ticket-signing.util';

@Injectable()
export class TicketsService {
  constructor(private readonly configService: ConfigService) {}

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
}
