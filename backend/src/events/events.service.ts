import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Event, EventStatus, Prisma, Section } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventListQueryDto } from './dto/event-list-query.dto';
import { EVENTS_LIMITS } from './events.constants';
import { generateSeatsForSection } from './utils/seat-label.util';

type EventWithSections = Event & { sections: Section[] };

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizerId: string, dto: CreateEventDto) {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Data de início inválida.');
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('A data do evento precisa ser no futuro.');
    }

    const totalSeats = dto.sections.reduce(
      (sum, section) => sum + section.rowsCount * section.seatsPerRow,
      0,
    );
    if (totalSeats > EVENTS_LIMITS.MAX_EVENT_CAPACITY) {
      throw new BadRequestException(
        `A capacidade total (${totalSeats} assentos) excede o máximo permitido de ${EVENTS_LIMITS.MAX_EVENT_CAPACITY}.`,
      );
    }

    const alreadyImported = await this.prisma.event.findUnique({
      where: { externalId: dto.externalId },
    });
    if (alreadyImported) {
      throw new ConflictException(
        'Este evento do catálogo já foi importado para a plataforma.',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          imageUrl: dto.imageUrl,
          startsAt,
          venueName: dto.venueName,
          venueCity: dto.venueCity,
          venueAddress: dto.venueAddress,
          externalId: dto.externalId,
          externalSource: dto.externalSource ?? 'TICKETMASTER',
          externalRaw: dto.externalRaw
            ? (dto.externalRaw as Prisma.InputJsonValue)
            : undefined,
          organizerId,
          capacity: totalSeats,
          status: EventStatus.DRAFT,
        },
      });

      for (const sectionDto of dto.sections) {
        const section = await tx.section.create({
          data: {
            eventId: event.id,
            name: sectionDto.name,
            priceCents: sectionDto.priceCents,
            rowsCount: sectionDto.rowsCount,
            seatsPerRow: sectionDto.seatsPerRow,
            ...(sectionDto.colorHex ? { colorHex: sectionDto.colorHex } : {}),
          },
        });

        const seats = generateSeatsForSection(
          sectionDto.rowsCount,
          sectionDto.seatsPerRow,
        );
        await tx.seat.createMany({
          data: seats.map((seat) => ({
            sectionId: section.id,
            eventId: event.id,
            row: seat.row,
            number: seat.number,
            label: seat.label,
          })),
        });
      }

      return event;
    });

    const withSections = await this.prisma.event.findUniqueOrThrow({
      where: { id: created.id },
      include: { sections: true },
    });
    return this.toSummary(withSections);
  }

  async publish(organizerId: string, eventId: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'Você não tem permissão para publicar este evento.',
      );
    }
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        `Só é possível publicar eventos em rascunho (status atual: ${event.status}).`,
      );
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
    });
  }

  async findPublished(query: EventListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      ...(query.search
        ? {
            title: {
              contains: query.search,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(query.city
        ? {
            venueCity: {
              contains: query.city,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { sections: true },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: items.map((event) => this.toSummary(event)),
      total,
      page,
      pageSize,
    };
  }

  // Rota pública: só mostra eventos já publicados, independente de quem
  // pergunta (o organizador dono vê os próprios rascunhos via findMine(),
  // não por aqui — evita ter que sustentar autenticação "opcional").
  async findPublishedById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { sections: true },
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado.');
    }

    return this.toSummary(event);
  }

  async findMine(organizerId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      include: { sections: true },
    });

    return events.map((event) => this.toSummary(event));
  }

  private toSummary(event: EventWithSections) {
    const fromPriceCents =
      event.sections.length > 0
        ? Math.min(...event.sections.map((s) => s.priceCents))
        : 0;

    return { ...event, fromPriceCents };
  }
}
