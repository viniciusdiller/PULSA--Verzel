import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStatus, ReservationStatus, SeatStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';

function futureDate(daysFromNow = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

function pastDate(daysAgo = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: {
    event: { findUnique: jest.Mock };
    seat: { findUnique: jest.Mock; findMany: jest.Mock; updateMany: jest.Mock };
    reservation: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  type ReservationCreateArgs = { data: Record<string, unknown> };

  let tx: {
    $executeRaw: jest.Mock;
    reservation: {
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock<
        Promise<Record<string, unknown>>,
        [ReservationCreateArgs]
      >;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    seat: { update: jest.Mock; updateMany: jest.Mock };
    user: { update: jest.Mock };
  };
  let ticketsService: { issueForReservation: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      reservation: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn<
          Promise<Record<string, unknown>>,
          [ReservationCreateArgs]
        >(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      seat: { update: jest.fn(), updateMany: jest.fn() },
      user: { update: jest.fn() },
    };

    prisma = {
      event: { findUnique: jest.fn() },
      seat: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      reservation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ balanceCents: 0 }),
      },
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(tx);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    ticketsService = {
      issueForReservation: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    };
    configService = { get: jest.fn().mockReturnValue('7') };

    service = new ReservationsService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      ticketsService as unknown as TicketsService,
    );
  });

  describe('getSeatMap', () => {
    it('rejeita com NotFound quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(service.getSeatMap('event-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejeita com NotFound quando o evento ainda não foi publicado', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.DRAFT,
        sections: [],
      });
      await expect(service.getSeatMap('event-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trata um assento HELD com hold já expirado como AVAILABLE (expiração preguiçosa)', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.PUBLISHED,
        title: 'Show',
        startsAt: futureDate(),
        sections: [],
      });
      prisma.seat.findMany.mockResolvedValue([
        {
          id: 'seat-expired',
          sectionId: 's1',
          row: 'A',
          number: 1,
          label: 'A1',
          status: SeatStatus.HELD,
          reservations: [{ holdExpiresAt: pastDate() }],
        },
        {
          id: 'seat-active-hold',
          sectionId: 's1',
          row: 'A',
          number: 2,
          label: 'A2',
          status: SeatStatus.HELD,
          reservations: [{ holdExpiresAt: futureDate() }],
        },
        {
          id: 'seat-sold',
          sectionId: 's1',
          row: 'A',
          number: 3,
          label: 'A3',
          status: SeatStatus.SOLD,
          reservations: [],
        },
      ]);

      const result = await service.getSeatMap('event-1');

      expect(result.seats.find((s) => s.id === 'seat-expired')?.status).toBe(
        SeatStatus.AVAILABLE,
      );
      expect(
        result.seats.find((s) => s.id === 'seat-active-hold')?.status,
      ).toBe(SeatStatus.HELD);
      expect(result.seats.find((s) => s.id === 'seat-sold')?.status).toBe(
        SeatStatus.SOLD,
      );
    });

    it('inclui externalSource no evento retornado, pro front decidir "Palco" vs. "Tela"', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.PUBLISHED,
        title: 'A Origem',
        startsAt: futureDate(),
        externalSource: 'TMDB',
        sections: [],
      });
      prisma.seat.findMany.mockResolvedValue([]);

      const result = await service.getSeatMap('event-1');

      expect(result.event.externalSource).toBe('TMDB');
    });
  });

  describe('holdSeat', () => {
    const event = {
      id: 'event-1',
      status: EventStatus.PUBLISHED,
      startsAt: futureDate(),
    };
    const seat = {
      id: 'seat-1',
      eventId: 'event-1',
      section: { priceCents: 5000 },
    };

    it('rejeita com NotFound quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com NotFound quando o evento não está publicado', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...event,
        status: EventStatus.DRAFT,
      });
      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com BadRequest quando o evento já aconteceu', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...event,
        startsAt: pastDate(),
      });
      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita com NotFound quando o assento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(event);
      prisma.seat.findUnique.mockResolvedValue(null);
      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com NotFound quando o assento pertence a outro evento', async () => {
      prisma.event.findUnique.mockResolvedValue(event);
      prisma.seat.findUnique.mockResolvedValue({
        ...seat,
        eventId: 'outro-evento',
      });
      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('cria a reserva com o preço da seção e marca o assento como HELD, usando lock por assento', async () => {
      prisma.event.findUnique.mockResolvedValue(event);
      prisma.seat.findUnique.mockResolvedValue(seat);
      tx.reservation.findFirst.mockResolvedValue(null);
      tx.reservation.create.mockResolvedValue({
        id: 'res-1',
        status: ReservationStatus.HOLDING,
        totalCents: 5000,
      });

      const result = await service.holdSeat('cust-1', 'event-1', 'seat-1');

      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      const createArgs = tx.reservation.create.mock.calls[0][0];
      expect(createArgs.data).toMatchObject({
        eventId: 'event-1',
        seatId: 'seat-1',
        customerId: 'cust-1',
        status: ReservationStatus.HOLDING,
        totalCents: 5000,
      });
      expect(tx.seat.update).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: SeatStatus.HELD },
      });
      expect(result.id).toBe('res-1');
    });

    it('rejeita com BadRequest quando o assento já está vendido (PAID)', async () => {
      prisma.event.findUnique.mockResolvedValue(event);
      prisma.seat.findUnique.mockResolvedValue(seat);
      tx.reservation.findFirst.mockResolvedValue({
        id: 'res-existente',
        status: ReservationStatus.PAID,
      });

      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(BadRequestException);
      expect(tx.reservation.create).not.toHaveBeenCalled();
    });

    it('rejeita com BadRequest quando o assento já está em hold ativo por outra reserva', async () => {
      prisma.event.findUnique.mockResolvedValue(event);
      prisma.seat.findUnique.mockResolvedValue(seat);
      tx.reservation.findFirst.mockResolvedValue({
        id: 'res-existente',
        status: ReservationStatus.HOLDING,
      });

      await expect(
        service.holdSeat('cust-1', 'event-1', 'seat-1'),
      ).rejects.toThrow(BadRequestException);
      expect(tx.reservation.create).not.toHaveBeenCalled();
    });
  });

  describe('getMine', () => {
    it('rejeita com NotFound quando a reserva não existe', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.getMine('cust-1', 'res-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejeita com Forbidden quando a reserva pertence a outro cliente', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        customerId: 'outro-cliente',
      });
      await expect(service.getMine('cust-1', 'res-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('retorna a reserva quando pertence ao cliente autenticado', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        customerId: 'cust-1',
      });
      await expect(service.getMine('cust-1', 'res-1')).resolves.toEqual({
        id: 'res-1',
        customerId: 'cust-1',
      });
    });
  });

  describe('pay', () => {
    const holdingReservation = {
      id: 'res-1',
      customerId: 'cust-1',
      seatId: 'seat-1',
      status: ReservationStatus.HOLDING,
      holdExpiresAt: futureDate(),
      totalCents: 15000,
    };

    it('rejeita com NotFound quando a reserva não existe', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(
        service.pay('cust-1', 'res-1', { cardNumber: '4242424242424242' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com Forbidden quando a reserva pertence a outro cliente', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...holdingReservation,
        customerId: 'outro',
      });
      await expect(
        service.pay('cust-1', 'res-1', { cardNumber: '4242424242424242' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita com BadRequest quando a reserva não está mais em HOLDING', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.PAID,
      });
      await expect(
        service.pay('cust-1', 'res-1', { cardNumber: '4242424242424242' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('expira a reserva e rejeita com Gone quando o hold já passou do prazo', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...holdingReservation,
        holdExpiresAt: pastDate(),
      });

      await expect(
        service.pay('cust-1', 'res-1', { cardNumber: '4242424242424242' }),
      ).rejects.toThrow(GoneException);
    });

    it('trata holdExpiresAt nulo como expirado (caso defensivo)', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...holdingReservation,
        holdExpiresAt: null,
      });

      await expect(
        service.pay('cust-1', 'res-1', { cardNumber: '4242424242424242' }),
      ).rejects.toThrow(GoneException);
    });

    it('rejeita com BadRequest um número de cartão malformado, sem chegar a abrir transação', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);

      await expect(
        service.pay('cust-1', 'res-1', { cardNumber: 'abc' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('aprova o pagamento com o cartão de teste de aprovação: marca PAID, assento SOLD e emite o ticket', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      tx.reservation.update.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.PAID,
      });

      const result = await service.pay('cust-1', 'res-1', {
        cardNumber: '4242 4242 4242 4242',
      });

      expect(tx.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {
          status: ReservationStatus.PAID,
          paymentCardLast4: '4242',
          balanceAppliedCents: 0,
        },
      });
      expect(tx.seat.update).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: SeatStatus.SOLD },
      });
      expect(ticketsService.issueForReservation).toHaveBeenCalledTimes(1);
      expect(result.ticket).toEqual({ id: 'ticket-1' });
      expect(result.reservation.status).toBe(ReservationStatus.PAID);
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('recusa o pagamento com o cartão de teste de recusa: marca DECLINED, libera o assento e não emite ticket', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      tx.reservation.update.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.DECLINED,
        paymentDeclineReason: 'Cartão recusado pela operadora (simulado).',
      });

      const result = await service.pay('cust-1', 'res-1', {
        cardNumber: '4000 0000 0000 0002',
      });

      expect(tx.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {
          status: ReservationStatus.DECLINED,
          paymentCardLast4: '0002',
          paymentDeclineReason: 'Cartão recusado pela operadora (simulado).',
        },
      });
      expect(tx.seat.update).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: SeatStatus.AVAILABLE },
      });
      expect(ticketsService.issueForReservation).not.toHaveBeenCalled();
      expect(result.ticket).toBeNull();
      expect(result.reservation.status).toBe(ReservationStatus.DECLINED);
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('paga inteiramente com saldo quando ele cobre o total — nem exige nem simula cartão', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ balanceCents: 20000 });
      tx.reservation.update.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.PAID,
      });

      const result = await service.pay('cust-1', 'res-1', { useBalance: true });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { balanceCents: { decrement: 15000 } },
      });
      expect(tx.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {
          status: ReservationStatus.PAID,
          paymentCardLast4: null,
          balanceAppliedCents: 15000,
        },
      });
      expect(tx.seat.update).toHaveBeenCalledWith({
        where: { id: 'seat-1' },
        data: { status: SeatStatus.SOLD },
      });
      expect(ticketsService.issueForReservation).toHaveBeenCalledTimes(1);
      expect(result.reservation.status).toBe(ReservationStatus.PAID);
    });

    it('abate o saldo disponível e cobra o restante no cartão quando o saldo cobre só parte do total', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ balanceCents: 5000 });
      tx.reservation.update.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.PAID,
      });

      await service.pay('cust-1', 'res-1', {
        useBalance: true,
        cardNumber: '4242 4242 4242 4242',
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { balanceCents: { decrement: 5000 } },
      });
      expect(tx.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {
          status: ReservationStatus.PAID,
          paymentCardLast4: '4242',
          balanceAppliedCents: 5000,
        },
      });
    });

    it('rejeita com BadRequest quando o saldo não cobre tudo e nenhum cartão foi informado', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ balanceCents: 5000 });

      await expect(
        service.pay('cust-1', 'res-1', { useBalance: true }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('não debita nada do saldo quando o cartão da parte restante é recusado', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      prisma.user.findUniqueOrThrow.mockResolvedValue({ balanceCents: 5000 });
      tx.reservation.update.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.DECLINED,
      });

      const result = await service.pay('cust-1', 'res-1', {
        useBalance: true,
        cardNumber: '4000 0000 0000 0002',
      });

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(result.reservation.status).toBe(ReservationStatus.DECLINED);
    });
  });

  describe('cancel', () => {
    const holdingReservation = {
      id: 'res-1',
      customerId: 'cust-1',
      seatId: 'seat-1',
      status: ReservationStatus.HOLDING,
      holdExpiresAt: futureDate(),
    };

    it('rejeita com NotFound quando a reserva não existe', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);
      await expect(service.cancel('cust-1', 'res-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejeita com Forbidden quando a reserva pertence a outro cliente', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...holdingReservation,
        customerId: 'outro',
      });
      await expect(service.cancel('cust-1', 'res-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejeita com BadRequest quando a reserva não está mais em HOLDING', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.PAID,
      });
      await expect(service.cancel('cust-1', 'res-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('cancela a reserva e libera o assento de volta pra AVAILABLE', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      tx.reservation.updateMany.mockResolvedValue({ count: 1 });
      tx.reservation.findUniqueOrThrow.mockResolvedValue({
        ...holdingReservation,
        status: ReservationStatus.CANCELED,
      });

      const result = await service.cancel('cust-1', 'res-1');

      expect(tx.reservation.updateMany).toHaveBeenCalledWith({
        where: { id: 'res-1', status: ReservationStatus.HOLDING },
        data: { status: ReservationStatus.CANCELED },
      });
      expect(tx.seat.updateMany).toHaveBeenCalledWith({
        where: { id: 'seat-1', status: SeatStatus.HELD },
        data: { status: SeatStatus.AVAILABLE },
      });
      expect(result.status).toBe(ReservationStatus.CANCELED);
    });

    it('trata como BadRequest quando outra operação (ex. pagamento) venceu a corrida antes do cancelamento', async () => {
      prisma.reservation.findUnique.mockResolvedValue(holdingReservation);
      tx.reservation.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.cancel('cust-1', 'res-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.seat.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('sweepExpiredHolds', () => {
    it('não faz nada quando não há holds expirados', async () => {
      prisma.reservation.findMany.mockResolvedValue([]);

      await service.sweepExpiredHolds();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('expira as reservas vencidas e libera os assentos correspondentes', async () => {
      prisma.reservation.findMany.mockResolvedValue([
        { id: 'res-1', seatId: 'seat-1' },
        { id: 'res-2', seatId: 'seat-2' },
      ]);

      await service.sweepExpiredHolds();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
