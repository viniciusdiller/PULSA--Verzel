import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Reservation, Ticket } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { verifyTicketQr } from './utils/ticket-signing.util';

const SECRET = 'test-secret-1234567890';

type TicketCreateArgs = { data: Record<string, unknown> };

describe('TicketsService', () => {
  let service: TicketsService;
  let configService: { getOrThrow: jest.Mock };
  let prisma: { ticket: { findMany: jest.Mock; findUnique: jest.Mock } };
  let tx: {
    ticket: {
      create: jest.Mock<Promise<Ticket>, [TicketCreateArgs]>;
      findUnique: jest.Mock;
    };
  };

  const reservation = {
    id: 'res-1',
    eventId: 'event-1',
    seatId: 'seat-1',
    customerId: 'cust-1',
  } as Reservation;

  beforeEach(() => {
    configService = { getOrThrow: jest.fn().mockReturnValue(SECRET) };
    prisma = { ticket: { findMany: jest.fn(), findUnique: jest.fn() } };
    tx = {
      ticket: {
        create: jest
          .fn<Promise<Ticket>, [TicketCreateArgs]>()
          .mockImplementation((args) =>
            Promise.resolve(args.data as unknown as Ticket),
          ),
        // Sem colisão por padrão — cada teste que quiser simular colisão
        // de shortCode sobrescreve isso explicitamente.
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    service = new TicketsService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  describe('issueForReservation', () => {
    it('cria o ticket com serial, shareSlug e um qrToken assinado e verificável', async () => {
      await service.issueForReservation(
        tx as unknown as Prisma.TransactionClient,
        reservation,
      );

      expect(tx.ticket.create).toHaveBeenCalledTimes(1);
      const createArgs = tx.ticket.create.mock.calls[0][0].data;

      expect(createArgs.reservationId).toBe('res-1');
      expect(createArgs.eventId).toBe('event-1');
      expect(createArgs.seatId).toBe('seat-1');
      expect(createArgs.ownerId).toBe('cust-1');
      expect(typeof createArgs.serial).toBe('string');
      expect(typeof createArgs.shareSlug).toBe('string');
      expect(createArgs.shortCode).toMatch(/^\d{6}$/);

      const decoded = verifyTicketQr(createArgs.qrToken as string, SECRET);
      expect(decoded).toEqual({
        ticketId: createArgs.id,
        eventId: 'event-1',
        serial: createArgs.serial,
      });
    });

    it('gera id, serial, shareSlug e qrToken diferentes a cada emissão', async () => {
      await service.issueForReservation(
        tx as unknown as Prisma.TransactionClient,
        reservation,
      );
      await service.issueForReservation(
        tx as unknown as Prisma.TransactionClient,
        reservation,
      );

      const [first, second] = tx.ticket.create.mock.calls.map(
        (call) => call[0].data,
      );
      expect(first.id).not.toBe(second.id);
      expect(first.serial).not.toBe(second.serial);
      expect(first.shareSlug).not.toBe(second.shareSlug);
      expect(first.qrToken).not.toBe(second.qrToken);
    });

    it('tenta novamente ao gerar um shortCode que já existe, até achar um livre', async () => {
      tx.ticket.findUnique
        .mockResolvedValueOnce({ id: 'colisao-1' })
        .mockResolvedValueOnce({ id: 'colisao-2' })
        .mockResolvedValueOnce(null);

      await service.issueForReservation(
        tx as unknown as Prisma.TransactionClient,
        reservation,
      );

      expect(tx.ticket.findUnique).toHaveBeenCalledTimes(3);
      expect(tx.ticket.create).toHaveBeenCalledTimes(1);
    });

    it('desiste após esgotar as tentativas se todo shortCode gerado já existir', async () => {
      tx.ticket.findUnique.mockResolvedValue({ id: 'sempre-colide' });

      await expect(
        service.issueForReservation(
          tx as unknown as Prisma.TransactionClient,
          reservation,
        ),
      ).rejects.toThrow(/código curto único/);

      expect(tx.ticket.create).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('busca os ingressos do dono, com evento e assento, do mais recente pro mais antigo', async () => {
      const tickets = [{ id: 't1' }, { id: 't2' }];
      prisma.ticket.findMany.mockResolvedValue(tickets);

      const result = await service.findMine('owner-1');

      expect(prisma.ticket.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner-1' },
        include: { event: true, seat: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBe(tickets);
    });
  });

  describe('findByShareSlug', () => {
    it('retorna o ticket sem o campo ownerId (não expõe o dono na rota pública)', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        shareSlug: 'slug-1',
        ownerId: 'owner-secreto',
        status: 'VALID',
      });

      const result = await service.findByShareSlug('slug-1');

      expect(result).toEqual({
        id: 't1',
        shareSlug: 'slug-1',
        status: 'VALID',
      });
      expect(result).not.toHaveProperty('ownerId');
    });

    it('rejeita com NotFound quando o shareSlug não existe', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findByShareSlug('slug-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
