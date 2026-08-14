import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ticket, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TicketQrPayload,
  verifyTicketQr,
} from '../tickets/utils/ticket-signing.util';

export type GateOutcome = 'VALID' | 'INVALID' | 'ALREADY_USED' | 'WRONG_EVENT';

export interface GateTicketSummary {
  ticketId: string;
  seatLabel: string;
  eventTitle: string;
}

export interface GateValidationResult {
  outcome: GateOutcome;
  message: string;
  ticket?: GateTicketSummary;
  usedAt?: Date | null;
  usedByGateUserId?: string | null;
}

type TicketWithRelations = Ticket & {
  seat: { label: string };
  event: { title: string };
};

@Injectable()
export class GateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async validate(
    eventId: string,
    rawCode: string,
    gateUserId: string,
  ): Promise<GateValidationResult> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }

    const secret = this.configService.getOrThrow<string>('QR_SIGNING_SECRET');
    const code = rawCode.trim();

    let payload: TicketQrPayload;
    try {
      payload = verifyTicketQr(code, secret);
    } catch {
      return { outcome: 'INVALID', message: 'Código inválido ou adulterado.' };
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: payload.ticketId },
      include: {
        seat: { select: { label: true } },
        event: { select: { title: true } },
      },
    });

    // O serial também precisa bater com o do banco — não é só "o JWT tem
    // assinatura válida", é "esse JWT corresponde exatamente ao ingresso
    // que emitimos" (defesa extra, ainda que na prática o ticketId já seja
    // um UUID único o suficiente).
    if (!ticket || ticket.serial !== payload.serial) {
      return { outcome: 'INVALID', message: 'Código inválido ou adulterado.' };
    }

    if (ticket.eventId !== eventId) {
      return {
        outcome: 'WRONG_EVENT',
        message: `Este ingresso é válido para outro evento: "${ticket.event.title}".`,
        ticket: this.summarize(ticket),
      };
    }

    if (ticket.status === TicketStatus.VOID) {
      return {
        outcome: 'INVALID',
        message: 'Ingresso inválido.',
        ticket: this.summarize(ticket),
      };
    }

    if (ticket.status === TicketStatus.USED) {
      return {
        outcome: 'ALREADY_USED',
        message: `Ingresso já utilizado em ${ticket.usedAt?.toISOString() ?? 'data desconhecida'}.`,
        ticket: this.summarize(ticket),
        usedAt: ticket.usedAt,
        usedByGateUserId: ticket.usedByGateUserId,
      };
    }

    // Update condicional atômico: só marca USED se ainda estiver VALID.
    // `count === 0` significa que outra validação venceu a corrida entre
    // a leitura acima e este update — mesma estratégia de "atualização
    // condicional + checar linhas afetadas" usada no lock de assento.
    const now = new Date();
    const updateResult = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: TicketStatus.VALID },
      data: {
        status: TicketStatus.USED,
        usedAt: now,
        usedByGateUserId: gateUserId,
      },
    });

    if (updateResult.count === 0) {
      const current = await this.prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: {
          seat: { select: { label: true } },
          event: { select: { title: true } },
        },
      });
      return {
        outcome: 'ALREADY_USED',
        message: `Ingresso já utilizado em ${current.usedAt?.toISOString() ?? 'data desconhecida'}.`,
        ticket: this.summarize(current),
        usedAt: current.usedAt,
        usedByGateUserId: current.usedByGateUserId,
      };
    }

    return {
      outcome: 'VALID',
      message: 'Ingresso válido. Entrada liberada.',
      ticket: this.summarize(ticket),
      usedAt: now,
      usedByGateUserId: gateUserId,
    };
  }

  private summarize(ticket: TicketWithRelations): GateTicketSummary {
    return {
      ticketId: ticket.id,
      seatLabel: ticket.seat.label,
      eventTitle: ticket.event.title,
    };
  }
}
