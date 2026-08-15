import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EVENTS_LIMITS } from './events.constants';

function futureIso(daysFromNow = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function baseCreateDto(
  overrides: Partial<CreateEventDto> = {},
): CreateEventDto {
  return {
    title: 'Show de Teste',
    description: 'Descrição longa o suficiente para passar na validação.',
    startsAt: futureIso(),
    venueName: 'Arena Teste',
    venueCity: 'São Paulo',
    venueAddress: 'Rua Teste, 123',
    externalId: 'ext-123',
    sections: [
      { name: 'Pista', priceCents: 5000, rowsCount: 2, seatsPerRow: 3 },
    ],
    ...overrides,
  };
}

type EventCreateArgs = { data: Record<string, unknown> };
type SeatCreateManyArgs = {
  data: Array<{
    sectionId: string;
    eventId: string;
    row: string;
    number: number;
    label: string;
  }>;
};
type EventFindManyArgs = {
  where: {
    status: EventStatus;
    title?: { contains: string };
    venueCity?: { contains: string };
  };
  skip: number;
  take: number;
};

describe('EventsService', () => {
  let service: EventsService;
  let prisma: {
    event: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock<Promise<unknown[]>, [EventFindManyArgs]>;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    reservation: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    event: {
      create: jest.Mock<Promise<{ id: string }>, [EventCreateArgs]>;
      update: jest.Mock;
    };
    section: { create: jest.Mock; deleteMany: jest.Mock };
    seat: {
      createMany: jest.Mock<Promise<{ count: number }>, [SeatCreateManyArgs]>;
    };
  };

  beforeEach(() => {
    tx = {
      event: {
        create: jest.fn<Promise<{ id: string }>, [EventCreateArgs]>(),
        update: jest.fn(),
      },
      section: { create: jest.fn(), deleteMany: jest.fn() },
      seat: {
        createMany: jest.fn<Promise<{ count: number }>, [SeatCreateManyArgs]>(),
      },
    };

    prisma = {
      event: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn<Promise<unknown[]>, [EventFindManyArgs]>(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      reservation: { count: jest.fn() },
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)(tx);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    service = new EventsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('cria o evento, as seções e gera os assentos corretamente dentro de uma transação', async () => {
      prisma.event.findUnique.mockResolvedValue(null); // externalId ainda não importado
      tx.event.create.mockResolvedValue({ id: 'event-1' });
      tx.section.create.mockResolvedValue({ id: 'section-1' });
      tx.seat.createMany.mockResolvedValue({ count: 6 });
      prisma.event.findUniqueOrThrow.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.DRAFT,
        capacity: 6,
        sections: [{ id: 'section-1', priceCents: 5000 }],
      });

      const dto = baseCreateDto();
      const result = await service.create('organizer-1', dto);

      const createCallArgs = tx.event.create.mock.calls[0][0];
      expect(createCallArgs.data).toMatchObject({
        organizerId: 'organizer-1',
        capacity: 6,
        status: EventStatus.DRAFT,
        externalSource: 'TICKETMASTER',
      });

      const seatsArg = tx.seat.createMany.mock.calls[0][0].data;
      expect(seatsArg).toHaveLength(6);
      expect(seatsArg).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ row: 'A', number: 1, label: 'A1' }),
          expect.objectContaining({ row: 'B', number: 3, label: 'B3' }),
        ]),
      );

      expect(result.fromPriceCents).toBe(5000);
    });

    it('usa o externalSource informado no DTO quando presente', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      tx.event.create.mockResolvedValue({ id: 'event-1' });
      tx.section.create.mockResolvedValue({ id: 'section-1' });
      prisma.event.findUniqueOrThrow.mockResolvedValue({
        id: 'event-1',
        sections: [],
      });

      await service.create(
        'organizer-1',
        baseCreateDto({ externalSource: 'TMDB' }),
      );

      const createCallArgs = tx.event.create.mock.calls[0][0];
      expect(createCallArgs.data.externalSource).toBe('TMDB');
    });

    it('rejeita quando a data do evento é inválida', async () => {
      await expect(
        service.create(
          'organizer-1',
          baseCreateDto({ startsAt: 'nao-e-uma-data' }),
        ),
      ).rejects.toThrow(new BadRequestException('Data de início inválida.'));
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita quando a data do evento está no passado', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        service.create(
          'organizer-1',
          baseCreateDto({ startsAt: yesterday.toISOString() }),
        ),
      ).rejects.toThrow(
        new BadRequestException('A data do evento precisa ser no futuro.'),
      );
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    });

    it('rejeita quando a capacidade total excede o máximo permitido', async () => {
      const dto = baseCreateDto({
        sections: [
          {
            name: 'Setor gigante',
            priceCents: 1000,
            rowsCount: 50,
            seatsPerRow: 50,
          },
        ],
      });

      await expect(service.create('organizer-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('aceita exatamente o limite máximo de capacidade', async () => {
      prisma.event.findUnique.mockResolvedValue(null);
      tx.event.create.mockResolvedValue({ id: 'event-1' });
      tx.section.create.mockResolvedValue({ id: 'section-1' });
      prisma.event.findUniqueOrThrow.mockResolvedValue({
        id: 'event-1',
        sections: [],
      });

      const dto = baseCreateDto({
        sections: [
          { name: 'Setor', priceCents: 1000, rowsCount: 30, seatsPerRow: 10 },
        ],
      });
      expect(dto.sections[0].rowsCount * dto.sections[0].seatsPerRow).toBe(
        EVENTS_LIMITS.MAX_EVENT_CAPACITY,
      );

      await expect(service.create('organizer-1', dto)).resolves.toBeDefined();
    });

    it('rejeita reimportar um evento cujo externalId já existe', async () => {
      prisma.event.findUnique.mockResolvedValue({ id: 'evento-existente' });

      await expect(
        service.create('organizer-1', baseCreateDto()),
      ).rejects.toThrow(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('publica um evento em rascunho pertencente ao organizador', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.DRAFT,
      });
      prisma.event.update.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.PUBLISHED,
      });

      const result = await service.publish('organizer-1', 'event-1');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { status: EventStatus.PUBLISHED },
      });
      expect(result.status).toBe(EventStatus.PUBLISHED);
    });

    it('rejeita com NotFound quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.publish('organizer-1', 'evento-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com Forbidden quando quem publica não é o organizador dono', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'outro-organizador',
        status: EventStatus.DRAFT,
      });

      await expect(service.publish('organizer-1', 'event-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it.each([EventStatus.PUBLISHED, EventStatus.CANCELED])(
      'rejeita publicar um evento que já está %s',
      async (status) => {
        prisma.event.findUnique.mockResolvedValue({
          id: 'event-1',
          organizerId: 'organizer-1',
          status,
        });

        await expect(service.publish('organizer-1', 'event-1')).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.event.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('findPublishedById', () => {
    it('retorna o evento quando está publicado', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.PUBLISHED,
        sections: [{ priceCents: 3000 }, { priceCents: 1000 }],
      });

      const result = await service.findPublishedById('event-1');

      expect(result.fromPriceCents).toBe(1000);
    });

    it('rejeita com NotFound quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.findPublishedById('evento-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com NotFound (não Forbidden) quando o evento existe mas ainda é rascunho — evita enumeração', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.DRAFT,
        sections: [],
      });

      await expect(service.findPublishedById('event-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMine', () => {
    it('retorna todos os eventos do organizador, em qualquer status, com preço mínimo calculado', async () => {
      prisma.event.findMany.mockResolvedValue([
        {
          id: 'e1',
          organizerId: 'organizer-1',
          status: EventStatus.DRAFT,
          sections: [],
        },
        {
          id: 'e2',
          organizerId: 'organizer-1',
          status: EventStatus.PUBLISHED,
          sections: [{ priceCents: 2000 }, { priceCents: 500 }],
        },
      ]);

      const result = await service.findMine('organizer-1');

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizerId: 'organizer-1' } }),
      );
      expect(result[0].fromPriceCents).toBe(0);
      expect(result[1].fromPriceCents).toBe(500);
    });
  });

  describe('findPublished (listagem)', () => {
    it('filtra por status publicado e aplica busca/cidade/paginação', async () => {
      prisma.event.findMany.mockResolvedValue([
        { id: 'e1', sections: [{ priceCents: 1000 }] },
      ]);
      prisma.event.count.mockResolvedValue(1);

      const result = await service.findPublished({
        search: 'show',
        city: 'porto',
        page: 2,
        pageSize: 5,
      });

      const findManyArgs = prisma.event.findMany.mock.calls[0][0];
      expect(findManyArgs.where.status).toBe(EventStatus.PUBLISHED);
      expect(findManyArgs.where.title).toMatchObject({ contains: 'show' });
      expect(findManyArgs.where.venueCity).toMatchObject({ contains: 'porto' });
      expect(findManyArgs.skip).toBe(5);
      expect(findManyArgs.take).toBe(5);
      expect(result).toEqual({
        items: [
          { id: 'e1', sections: [{ priceCents: 1000 }], fromPriceCents: 1000 },
        ],
        total: 1,
        page: 2,
        pageSize: 5,
      });
    });

    it('usa página 1 e pageSize 20 como padrão quando não informados', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);

      await service.findPublished({});

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('unpublish', () => {
    it('despublica um evento publicado pertencente ao organizador', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.PUBLISHED,
      });
      prisma.event.update.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.DRAFT,
      });

      const result = await service.unpublish('organizer-1', 'event-1');

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { status: EventStatus.DRAFT },
      });
      expect(result.status).toBe(EventStatus.DRAFT);
    });

    it('rejeita com NotFound quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.unpublish('organizer-1', 'evento-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com Forbidden quando quem despublica não é o organizador dono', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'outro-organizador',
        status: EventStatus.PUBLISHED,
      });

      await expect(service.unpublish('organizer-1', 'event-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it.each([EventStatus.DRAFT, EventStatus.CANCELED])(
      'rejeita despublicar um evento que já está %s',
      async (status) => {
        prisma.event.findUnique.mockResolvedValue({
          id: 'event-1',
          organizerId: 'organizer-1',
          status,
        });

        await expect(
          service.unpublish('organizer-1', 'event-1'),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.event.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('update', () => {
    it('atualiza só descrição/endereço sem mexer nos setores quando `sections` não é enviado', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.DRAFT,
      });
      prisma.event.findUniqueOrThrow.mockResolvedValue({
        id: 'event-1',
        description: 'Nova descrição',
        sections: [],
      });

      await service.update('organizer-1', 'event-1', {
        description: 'Nova descrição',
      });

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { description: 'Nova descrição' },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.reservation.count).not.toHaveBeenCalled();
    });

    it('substitui os setores (apaga os antigos e recria) quando o evento nunca teve reserva', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.DRAFT,
      });
      prisma.reservation.count.mockResolvedValue(0);
      tx.section.create.mockResolvedValue({ id: 'section-novo' });
      tx.seat.createMany.mockResolvedValue({ count: 4 });
      prisma.event.findUniqueOrThrow.mockResolvedValue({
        id: 'event-1',
        capacity: 4,
        sections: [{ id: 'section-novo', priceCents: 8000 }],
      });

      const result = await service.update('organizer-1', 'event-1', {
        sections: [
          {
            name: 'Setor Novo',
            priceCents: 8000,
            rowsCount: 2,
            seatsPerRow: 2,
          },
        ],
      });

      expect(tx.section.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
      });
      const seatsArg = tx.seat.createMany.mock.calls[0][0].data;
      expect(seatsArg).toHaveLength(4);
      expect(tx.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { capacity: 4 },
      });
      expect(result.fromPriceCents).toBe(8000);
    });

    it('rejeita alterar setores quando o evento já teve alguma reserva (mesmo expirada/cancelada)', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.DRAFT,
      });
      prisma.reservation.count.mockResolvedValue(1);

      await expect(
        service.update('organizer-1', 'event-1', {
          sections: [
            { name: 'X', priceCents: 1000, rowsCount: 1, seatsPerRow: 1 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita quando a capacidade total dos novos setores excede o máximo', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.DRAFT,
      });
      prisma.reservation.count.mockResolvedValue(0);

      await expect(
        service.update('organizer-1', 'event-1', {
          sections: [
            {
              name: 'Gigante',
              priceCents: 1000,
              rowsCount: EVENTS_LIMITS.MAX_ROWS,
              seatsPerRow: EVENTS_LIMITS.MAX_SEATS_PER_ROW,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejeita com Forbidden quando quem edita não é o organizador dono', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'outro-organizador',
        status: EventStatus.DRAFT,
      });

      await expect(
        service.update('organizer-1', 'event-1', {
          description: 'x'.repeat(20),
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('exclui um evento sem nenhuma reserva', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.DRAFT,
      });
      prisma.reservation.count.mockResolvedValue(0);
      prisma.event.delete.mockResolvedValue({ id: 'event-1' });

      await service.remove('organizer-1', 'event-1');

      expect(prisma.event.delete).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
    });

    it('rejeita com Conflict quando o evento já tem alguma reserva', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'organizer-1',
        status: EventStatus.PUBLISHED,
      });
      prisma.reservation.count.mockResolvedValue(2);

      await expect(service.remove('organizer-1', 'event-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('rejeita com NotFound quando o evento não existe', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('organizer-1', 'evento-inexistente'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita com Forbidden quando quem exclui não é o organizador dono', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        organizerId: 'outro-organizador',
        status: EventStatus.DRAFT,
      });

      await expect(service.remove('organizer-1', 'event-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.reservation.count).not.toHaveBeenCalled();
    });
  });
});
