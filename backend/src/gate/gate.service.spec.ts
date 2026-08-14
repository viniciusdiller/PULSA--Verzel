import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TicketStatus } from '@prisma/client';
import { GateService } from './gate.service';
import { PrismaService } from '../prisma/prisma.service';
import { signTicketQr } from '../tickets/utils/ticket-signing.util';

const SECRET = 'a-strong-enough-test-secret-1234567890';
const EVENT_ID = 'event-1';
const OTHER_EVENT_ID = 'event-2';

function makeCode(
  overrides: Partial<{
    ticketId: string;
    eventId: string;
    serial: string;
  }> = {},
) {
  return signTicketQr(
    {
      ticketId: 'ticket-1',
      eventId: EVENT_ID,
      serial: 'serial-1',
      ...overrides,
    },
    SECRET,
  );
}

describe('GateService', () => {
  let service: GateService;
  type UpdateManyArgs = {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  };

  let prisma: {
    event: { findUnique: jest.Mock };
    ticket: {
      findUnique: jest.Mock;
      updateMany: jest.Mock<Promise<{ count: number }>, [UpdateManyArgs]>;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let configService: { getOrThrow: jest.Mock };

  const baseTicket = {
    id: 'ticket-1',
    eventId: EVENT_ID,
    serial: 'serial-1',
    status: TicketStatus.VALID,
    usedAt: null,
    usedByGateUserId: null,
    seat: { label: 'A1' },
    event: { title: 'Show Principal' },
  };

  beforeEach(() => {
    prisma = {
      event: { findUnique: jest.fn().mockResolvedValue({ id: EVENT_ID }) },
      ticket: {
        findUnique: jest.fn(),
        updateMany: jest.fn<Promise<{ count: number }>, [UpdateManyArgs]>(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    configService = { getOrThrow: jest.fn().mockReturnValue(SECRET) };

    service = new GateService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );
  });

  it('rejeita com NotFound quando o evento da portaria não existe', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(
      service.validate(EVENT_ID, makeCode(), 'gate-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('retorna INVALID para um código que não é um JWT válido', async () => {
    const result = await service.validate(
      EVENT_ID,
      'isso-nao-e-um-codigo-valido',
      'gate-1',
    );

    expect(result.outcome).toBe('INVALID');
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('retorna INVALID para um código assinado com um secret diferente (forjado)', async () => {
    const forged = signTicketQr(
      { ticketId: 'ticket-1', eventId: EVENT_ID, serial: 'serial-1' },
      'outro-secret-completamente-diferente',
    );

    const result = await service.validate(EVENT_ID, forged, 'gate-1');

    expect(result.outcome).toBe('INVALID');
  });

  it('remove espaços em branco do código antes de verificar (colar de digitação manual)', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket);
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.validate(
      EVENT_ID,
      `  ${makeCode()}  \n`,
      'gate-1',
    );

    expect(result.outcome).toBe('VALID');
  });

  it('retorna INVALID quando o ticketId do token não existe no banco', async () => {
    prisma.ticket.findUnique.mockResolvedValue(null);

    const result = await service.validate(EVENT_ID, makeCode(), 'gate-1');

    expect(result.outcome).toBe('INVALID');
  });

  it('retorna INVALID quando o serial do token não bate com o do ticket no banco', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      ...baseTicket,
      serial: 'serial-diferente',
    });

    const result = await service.validate(EVENT_ID, makeCode(), 'gate-1');

    expect(result.outcome).toBe('INVALID');
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('retorna WRONG_EVENT quando o ingresso é de outro evento, mostrando o evento correto', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      ...baseTicket,
      eventId: OTHER_EVENT_ID,
    });

    const result = await service.validate(
      EVENT_ID,
      makeCode({ eventId: OTHER_EVENT_ID }),
      'gate-1',
    );

    expect(result.outcome).toBe('WRONG_EVENT');
    expect(result.message).toContain('Show Principal');
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('retorna INVALID para um ingresso VOID (cancelado)', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      ...baseTicket,
      status: TicketStatus.VOID,
    });

    const result = await service.validate(EVENT_ID, makeCode(), 'gate-1');

    expect(result.outcome).toBe('INVALID');
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('retorna ALREADY_USED com data e atendente quando o ingresso já foi validado antes', async () => {
    const usedAt = new Date('2026-01-01T20:00:00Z');
    prisma.ticket.findUnique.mockResolvedValue({
      ...baseTicket,
      status: TicketStatus.USED,
      usedAt,
      usedByGateUserId: 'gate-outro',
    });

    const result = await service.validate(EVENT_ID, makeCode(), 'gate-1');

    expect(result.outcome).toBe('ALREADY_USED');
    expect(result.usedAt).toEqual(usedAt);
    expect(result.usedByGateUserId).toBe('gate-outro');
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('valida com sucesso um ingresso VALID: marca USED atomicamente e libera a entrada', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket);
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.validate(EVENT_ID, makeCode(), 'gate-1');

    expect(result.outcome).toBe('VALID');
    expect(result.ticket).toEqual({
      ticketId: 'ticket-1',
      seatLabel: 'A1',
      eventTitle: 'Show Principal',
    });
    const updateArgs = prisma.ticket.updateMany.mock.calls[0][0];
    expect(updateArgs.where).toEqual({
      id: 'ticket-1',
      status: TicketStatus.VALID,
    });
    expect(updateArgs.data).toMatchObject({
      status: TicketStatus.USED,
      usedByGateUserId: 'gate-1',
    });
  });

  it('valida com sucesso usando o código curto de 6 dígitos digitado manualmente', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      ...baseTicket,
      shortCode: '482913',
    });
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.validate(EVENT_ID, '482913', 'gate-1');

    expect(result.outcome).toBe('VALID');
    expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shortCode: '482913' } }),
    );
  });

  it('aceita o código curto com espaços (ex. colado com espaço no meio)', async () => {
    prisma.ticket.findUnique.mockResolvedValue({
      ...baseTicket,
      shortCode: '482913',
    });
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.validate(EVENT_ID, '  482 913  ', 'gate-1');

    expect(result.outcome).toBe('VALID');
  });

  it('retorna INVALID quando o código curto não corresponde a nenhum ingresso', async () => {
    prisma.ticket.findUnique.mockResolvedValue(null);

    const result = await service.validate(EVENT_ID, '000000', 'gate-1');

    expect(result.outcome).toBe('INVALID');
  });

  it('não confunde uma string de 6 caracteres não numéricos com um código curto (tenta como JWT)', async () => {
    const result = await service.validate(EVENT_ID, 'abcdef', 'gate-1');

    expect(result.outcome).toBe('INVALID');
  });

  it('trata como ALREADY_USED quando duas validações concorrentes disputam o mesmo ingresso (count=0)', async () => {
    prisma.ticket.findUnique.mockResolvedValue(baseTicket);
    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });
    prisma.ticket.findUniqueOrThrow.mockResolvedValue({
      ...baseTicket,
      status: TicketStatus.USED,
      usedAt: new Date('2026-01-01T20:05:00Z'),
      usedByGateUserId: 'gate-concorrente',
    });

    const result = await service.validate(EVENT_ID, makeCode(), 'gate-1');

    expect(result.outcome).toBe('ALREADY_USED');
    expect(result.usedByGateUserId).toBe('gate-concorrente');
  });
});
