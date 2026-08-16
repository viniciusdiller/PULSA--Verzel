import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EventStatus,
  Reservation,
  ReservationStatus,
  SeatStatus,
  Ticket,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { PayReservationDto } from './dto/pay-reservation.dto';
import { DEFAULT_HOLD_TTL_MINUTES } from './reservations.constants';
import {
  normalizeCardNumber,
  simulatePayment,
} from './utils/payment-mock.util';

export interface SeatMapSeat {
  id: string;
  sectionId: string;
  row: string;
  number: number;
  label: string;
  status: SeatStatus;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ticketsService: TicketsService,
  ) {}

  private getHoldTtlMinutes(): number {
    const raw = this.configService.get<string>('HOLD_TTL_MINUTES');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_HOLD_TTL_MINUTES;
  }

  async getSeatMap(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { sections: true },
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado.');
    }

    const now = new Date();
    const seats = await this.prisma.seat.findMany({
      where: { eventId },
      include: {
        reservations: {
          where: { status: ReservationStatus.HOLDING },
          select: { holdExpiresAt: true },
        },
      },
      orderBy: [{ sectionId: 'asc' }, { row: 'asc' }, { number: 'asc' }],
    });

    const seatMap: SeatMapSeat[] = seats.map((seat) => {
      let status = seat.status;

      // Leitura "preguiçosa" da expiração: mesmo antes do sweeper rodar,
      // um assento cujo hold já expirou aparece como disponível aqui.
      if (status === SeatStatus.HELD) {
        const stillHeld = seat.reservations.some(
          (r) => r.holdExpiresAt && r.holdExpiresAt.getTime() > now.getTime(),
        );
        if (!stillHeld) {
          status = SeatStatus.AVAILABLE;
        }
      }

      return {
        id: seat.id,
        sectionId: seat.sectionId,
        row: seat.row,
        number: seat.number,
        label: seat.label,
        status,
      };
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        // O front usa isso só pra trocar o rótulo "Palco"/"Tela" acima
        // do mapa de assentos conforme a fonte do evento (show vs.
        // filme) — não precisa de mais nada do catálogo aqui.
        externalSource: event.externalSource,
      },
      sections: event.sections,
      seats: seatMap,
    };
  }

  async holdSeat(
    customerId: string,
    eventId: string,
    seatId: string,
  ): Promise<Reservation> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado.');
    }
    if (event.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('Este evento já aconteceu.');
    }

    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      include: { section: true },
    });
    if (!seat || seat.eventId !== eventId) {
      throw new NotFoundException('Assento não encontrado para este evento.');
    }

    const holdExpiresAt = new Date(
      Date.now() + this.getHoldTtlMinutes() * 60_000,
    );

    return this.prisma.$transaction(async (tx) => {
      // Serializa qualquer outra tentativa concorrente sobre o MESMO
      // assento — quem chegar depois só prossegue quando esta transação
      // commitar/reverter, então a checagem abaixo já reflete a decisão
      // mais recente.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${seatId})::bigint)`;

      const now = new Date();
      const activeReservation = await tx.reservation.findFirst({
        where: {
          seatId,
          OR: [
            { status: ReservationStatus.PAID },
            { status: ReservationStatus.HOLDING, holdExpiresAt: { gt: now } },
          ],
        },
      });

      if (activeReservation) {
        throw new BadRequestException(
          'Este assento já está reservado ou vendido.',
        );
      }

      const reservation = await tx.reservation.create({
        data: {
          eventId,
          seatId,
          customerId,
          status: ReservationStatus.HOLDING,
          holdExpiresAt,
          totalCents: seat.section.priceCents,
        },
      });

      await tx.seat.update({
        where: { id: seatId },
        data: { status: SeatStatus.HELD },
      });

      return reservation;
    });
  }

  async getMine(
    customerId: string,
    reservationId: string,
  ): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('Esta reserva não pertence a você.');
    }

    return reservation;
  }

  async pay(
    customerId: string,
    reservationId: string,
    dto: PayReservationDto,
  ): Promise<{ reservation: Reservation; ticket: Ticket | null }> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('Esta reserva não pertence a você.');
    }
    if (reservation.status !== ReservationStatus.HOLDING) {
      throw new BadRequestException(
        `Não é possível pagar uma reserva com status ${reservation.status}.`,
      );
    }
    if (
      !reservation.holdExpiresAt ||
      reservation.holdExpiresAt.getTime() <= Date.now()
    ) {
      await this.expireHold(reservation.id, reservation.seatId);
      throw new GoneException('O tempo da reserva expirou. Reserve novamente.');
    }

    // Saldo cobre o quanto der, o cartão (se precisar) só entra pro
    // restante — nunca o contrário, pra não cobrar no cartão algo que o
    // saldo já cobriria.
    const customer = await this.prisma.user.findUniqueOrThrow({
      where: { id: customerId },
    });
    const balanceToApply = dto.useBalance
      ? Math.min(customer.balanceCents, reservation.totalCents)
      : 0;
    const remainingCents = reservation.totalCents - balanceToApply;

    let outcome: { approved: boolean; declineReason?: string };
    let last4: string | null = null;

    if (remainingCents === 0) {
      // Saldo cobriu o valor inteiro — nem simula cartão, aprova direto.
      outcome = { approved: true };
    } else {
      if (!dto.cardNumber) {
        throw new BadRequestException(
          'Informe um cartão para pagar a parte não coberta pelo saldo.',
        );
      }
      // Pode lançar BadRequestException para número de cartão malformado —
      // deixamos propagar antes de tocar no banco.
      outcome = simulatePayment(dto.cardNumber);
      last4 = normalizeCardNumber(dto.cardNumber).slice(-4);
    }

    return this.prisma.$transaction(async (tx) => {
      if (!outcome.approved) {
        // Recusado: nada de saldo é debitado — só o cartão falhou, o
        // saldo do cliente continua intacto pra tentar de novo.
        const declined = await tx.reservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.DECLINED,
            paymentCardLast4: last4,
            paymentDeclineReason: outcome.declineReason,
          },
        });
        await tx.seat.update({
          where: { id: reservation.seatId },
          data: { status: SeatStatus.AVAILABLE },
        });
        return { reservation: declined, ticket: null };
      }

      if (balanceToApply > 0) {
        await tx.user.update({
          where: { id: customerId },
          data: { balanceCents: { decrement: balanceToApply } },
        });
      }

      const paid = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.PAID,
          paymentCardLast4: last4,
          balanceAppliedCents: balanceToApply,
        },
      });
      await tx.seat.update({
        where: { id: reservation.seatId },
        data: { status: SeatStatus.SOLD },
      });
      const ticket = await this.ticketsService.issueForReservation(tx, paid);

      return { reservation: paid, ticket };
    });
  }

  // Desistência explícita do cliente antes de pagar — sem isso, o único
  // jeito de "devolver" o assento era esperar o TTL inteiro (até 7min)
  // mesmo se a pessoa decidisse na hora que não quer mais aquele lugar.
  // Um app de ingresso real sempre tem essa saída.
  async cancel(
    customerId: string,
    reservationId: string,
  ): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    if (reservation.customerId !== customerId) {
      throw new ForbiddenException('Esta reserva não pertence a você.');
    }
    if (reservation.status !== ReservationStatus.HOLDING) {
      throw new BadRequestException(
        `Não é possível cancelar uma reserva com status ${reservation.status}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Update condicional atômico: só cancela se ainda estiver HOLDING —
      // mesma estratégia de "atualização condicional + checar linhas
      // afetadas" usada no gate e no sweeper, pra não pisar num pagamento
      // que aprovou entre a leitura acima e este update.
      const updateResult = await tx.reservation.updateMany({
        where: { id: reservationId, status: ReservationStatus.HOLDING },
        data: { status: ReservationStatus.CANCELED },
      });
      if (updateResult.count === 0) {
        throw new BadRequestException('Esta reserva não está mais em espera.');
      }

      await tx.seat.updateMany({
        where: { id: reservation.seatId, status: SeatStatus.HELD },
        data: { status: SeatStatus.AVAILABLE },
      });

      return tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    });
  }

  private async expireHold(
    reservationId: string,
    seatId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.EXPIRED },
      }),
      this.prisma.seat.updateMany({
        where: { id: seatId, status: SeatStatus.HELD },
        data: { status: SeatStatus.AVAILABLE },
      }),
    ]);
  }

  // Limpeza/consistência periódica — a garantia de correção em si já vem
  // da reconferência de holdExpiresAt dentro da transação de escrita
  // (holdSeat/pay), não deste job. Isso só evita que assentos fiquem
  // "presos" como HELD indefinidamente na leitura do mapa antes de
  // alguém tentar reservá-los de novo.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweepExpiredHolds(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.reservation.findMany({
      where: { status: ReservationStatus.HOLDING, holdExpiresAt: { lte: now } },
      select: { id: true, seatId: true },
    });

    if (expired.length === 0) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.reservation.updateMany({
        where: { id: { in: expired.map((r) => r.id) } },
        data: { status: ReservationStatus.EXPIRED },
      }),
      this.prisma.seat.updateMany({
        where: {
          id: { in: expired.map((r) => r.seatId) },
          status: SeatStatus.HELD,
        },
        data: { status: SeatStatus.AVAILABLE },
      }),
    ]);

    this.logger.log(
      `Sweeper: ${expired.length} hold(s) expirado(s) liberado(s).`,
    );
  }
}
