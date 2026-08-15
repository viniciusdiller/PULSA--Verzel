import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Event,
  EventStatus,
  Prisma,
  ReservationStatus,
  Section,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventListQueryDto } from './dto/event-list-query.dto';
import { OrganizerEventListQueryDto } from './dto/organizer-event-list-query.dto';
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
    const event = await this.findOwnedEventOrThrow(organizerId, eventId);

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

  // Volta um evento publicado pra rascunho — some da listagem pública
  // (findPublished/findPublishedById), mas não mexe em nada que já
  // aconteceu: reservas e ingressos emitidos continuam válidos, porque a
  // validação na portaria depende só do status do Ticket, nunca do Event.
  async unpublish(organizerId: string, eventId: string): Promise<Event> {
    const event = await this.findOwnedEventOrThrow(organizerId, eventId);

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Só é possível despublicar eventos publicados (status atual: ${event.status}).`,
      );
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.DRAFT },
    });
  }

  // Edita descrição/endereço a qualquer momento (informativo, não afeta
  // assentos já vendidos). Setores só podem ser substituídos enquanto o
  // evento nunca teve nenhuma reserva — mesmo uma expirada/recusada/cancelada
  // deixa uma linha em Reservation apontando pro Seat antigo, e o banco
  // rejeitaria a exclusão em cascata (FK RESTRICT) mesmo que o assento
  // esteja livre hoje.
  async update(organizerId: string, eventId: string, dto: UpdateEventDto) {
    await this.findOwnedEventOrThrow(organizerId, eventId);

    if (dto.sections) {
      const reservationsCount = await this.prisma.reservation.count({
        where: { eventId },
      });
      if (reservationsCount > 0) {
        throw new BadRequestException(
          'Não é possível alterar os setores: este evento já teve reservas (mesmo que expiradas ou canceladas).',
        );
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

      await this.prisma.$transaction(async (tx) => {
        // Cascata: apagar as seções já apaga os assentos delas (Seat.section
        // tem onDelete: Cascade no schema).
        await tx.section.deleteMany({ where: { eventId } });

        for (const sectionDto of dto.sections!) {
          const section = await tx.section.create({
            data: {
              eventId,
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
              eventId,
              row: seat.row,
              number: seat.number,
              label: seat.label,
            })),
          });
        }

        await tx.event.update({
          where: { id: eventId },
          data: {
            capacity: totalSeats,
            ...(dto.description ? { description: dto.description } : {}),
            ...(dto.venueAddress ? { venueAddress: dto.venueAddress } : {}),
          },
        });
      });
    } else if (dto.description || dto.venueAddress) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          ...(dto.description ? { description: dto.description } : {}),
          ...(dto.venueAddress ? { venueAddress: dto.venueAddress } : {}),
        },
      });
    }

    const updated = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { sections: true },
    });
    return this.toSummary(updated);
  }

  // Dois caminhos bem diferentes atrás do mesmo botão "Excluir evento":
  // - Sem nenhuma reserva (nem histórica): exclusão de verdade, tira a
  //   linha do banco (cascata apaga seções/assentos).
  // - Com reserva: NÃO apaga nada. Vira "cancelar com estorno" —
  //   assinatura completamente diferente de uma exclusão, mas o
  //   organizador só vê um botão porque a intenção dele ("eu não quero
  //   mais esse evento na plataforma") é a mesma nos dois casos; quem
  //   decide qual caminho seguir é o histórico de reservas, não o
  //   organizador.
  async remove(
    organizerId: string,
    eventId: string,
  ): Promise<{ hardDeleted: boolean; refundedCustomers: number }> {
    await this.findOwnedEventOrThrow(organizerId, eventId);

    const reservationsCount = await this.prisma.reservation.count({
      where: { eventId },
    });

    if (reservationsCount === 0) {
      await this.prisma.event.delete({ where: { id: eventId } });
      return { hardDeleted: true, refundedCustomers: 0 };
    }

    const refundedCustomers = await this.cancelWithRefund(eventId);
    return { hardDeleted: false, refundedCustomers };
  }

  // Estorna em saldo da plataforma (User.balanceCents) todo cliente com
  // reserva PAGA neste evento, invalida os ingressos emitidos, cancela
  // holds ainda ativos, e marca o evento como CANCELED — nunca apagado,
  // porque o aviso que o cliente vê no próximo login (ver
  // EventCancellationNotice) e o histórico em "Meus ingressos" continuam
  // precisando existir depois disso.
  private async cancelWithRefund(eventId: string): Promise<number> {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
    });

    const paidReservations = await this.prisma.reservation.findMany({
      where: { eventId, status: ReservationStatus.PAID },
      include: { ticket: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const reservation of paidReservations) {
        await tx.user.update({
          where: { id: reservation.customerId },
          data: { balanceCents: { increment: reservation.totalCents } },
        });
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.CANCELED },
        });
        if (reservation.ticket) {
          await tx.ticket.update({
            where: { id: reservation.ticket.id },
            data: { status: TicketStatus.VOID },
          });
        }
        await tx.eventCancellationNotice.create({
          data: {
            userId: reservation.customerId,
            eventId,
            eventTitle: event.title,
            refundedCents: reservation.totalCents,
          },
        });
      }

      // Holds ainda em aberto (ninguém pagou nada ainda) só precisam ser
      // liberados — sem estorno, sem aviso, porque nenhum dinheiro trocou
      // de mãos.
      await tx.reservation.updateMany({
        where: { eventId, status: ReservationStatus.HOLDING },
        data: { status: ReservationStatus.CANCELED },
      });

      await tx.event.update({
        where: { id: eventId },
        data: { status: EventStatus.CANCELED },
      });
    });

    return paidReservations.length;
  }

  private async findOwnedEventOrThrow(
    organizerId: string,
    eventId: string,
  ): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado.');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este evento.',
      );
    }
    return event;
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

  // Usado pelas telas de detalhe/edição do organizador — pedir só o evento
  // que interessa em vez de puxar a lista paginada inteira e filtrar no
  // cliente, que quebraria assim que o organizador tivesse mais eventos
  // que cabem numa página.
  async findMineById(organizerId: string, eventId: string) {
    const event = await this.findOwnedEventOrThrow(organizerId, eventId);
    const withSections = await this.prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: { sections: true },
    });
    return this.toSummary(withSections);
  }

  async findMine(organizerId: string, query: OrganizerEventListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Prisma.EventWhereInput = {
      organizerId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

  private toSummary(event: EventWithSections) {
    const fromPriceCents =
      event.sections.length > 0
        ? Math.min(...event.sections.map((s) => s.priceCents))
        : 0;

    return { ...event, fromPriceCents };
  }
}
