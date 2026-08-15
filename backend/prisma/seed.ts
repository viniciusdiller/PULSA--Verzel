import { randomUUID } from 'crypto';
import { EventStatus, PrismaClient, Role, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSeatsForSection } from '../src/events/utils/seat-label.util';
import {
  generateSerial,
  generateShareSlug,
  generateShortCode,
  signTicketQr,
} from '../src/tickets/utils/ticket-signing.util';

const prisma = new PrismaClient();

// Senha padrão de todos os usuários semeados (documentada no README): "senha123"
const SEED_PASSWORD = 'senha123';
const BCRYPT_ROUNDS = 12;

const DAY_MS = 24 * 60 * 60 * 1000;

async function upsertUser(email: string, name: string, role: Role) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

interface SectionSeed {
  name: string;
  priceCents: number;
  rowsCount: number;
  seatsPerRow: number;
  colorHex?: string;
}

interface EventSeed {
  externalId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startsInDays: number;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  sections: SectionSeed[];
}

// Datas relativas a "agora" (não fixas) — o seed continua fazendo sentido
// não importa quando for rodado/re-rodado (deploy hoje, revisão daqui a
// duas semanas, etc.), sem parecer um evento "no passado".
const EVENT_SEEDS: EventSeed[] = [
  {
    externalId: 'seed-festival-verao-pulsa',
    title: 'Festival de Verão PULSA',
    description:
      'Um dia inteiro de música ao vivo em quatro palcos simultâneos, com line-up nacional e internacional.',
    imageUrl: null,
    startsInDays: 30,
    venueName: 'Arena Litoral',
    venueCity: 'Rio de Janeiro',
    venueAddress: 'Av. Atlântica, 1000',
    sections: [
      { name: 'Pista', priceCents: 18000, rowsCount: 4, seatsPerRow: 6 },
      { name: 'Camarote VIP', priceCents: 45000, rowsCount: 2, seatsPerRow: 4 },
    ],
  },
  {
    externalId: 'seed-classico-rio-sp',
    title: 'Clássico Rio x São Paulo',
    description:
      'O maior confronto do país, ao vivo e com portaria validada por QR — sem fila, sem ingresso falsificado.',
    imageUrl: null,
    startsInDays: 18,
    venueName: 'Estádio Municipal',
    venueCity: 'Sao Paulo',
    venueAddress: 'Av. dos Esportes, 500',
    sections: [
      { name: 'Arquibancada', priceCents: 8000, rowsCount: 5, seatsPerRow: 8 },
      { name: 'Cadeira Numerada', priceCents: 22000, rowsCount: 3, seatsPerRow: 6 },
    ],
  },
];

async function upsertPublishedEvent(organizerId: string, seed: EventSeed) {
  const existing = await prisma.event.findUnique({
    where: { externalId: seed.externalId },
  });
  if (existing) return existing;

  const totalSeats = seed.sections.reduce(
    (sum, s) => sum + s.rowsCount * s.seatsPerRow,
    0,
  );

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        title: seed.title,
        description: seed.description,
        imageUrl: seed.imageUrl,
        startsAt: new Date(Date.now() + seed.startsInDays * DAY_MS),
        venueName: seed.venueName,
        venueCity: seed.venueCity,
        venueAddress: seed.venueAddress,
        externalId: seed.externalId,
        externalSource: 'TICKETMASTER',
        organizerId,
        capacity: totalSeats,
        status: EventStatus.PUBLISHED,
      },
    });

    for (const sectionSeed of seed.sections) {
      const section = await tx.section.create({
        data: {
          eventId: event.id,
          name: sectionSeed.name,
          priceCents: sectionSeed.priceCents,
          rowsCount: sectionSeed.rowsCount,
          seatsPerRow: sectionSeed.seatsPerRow,
          ...(sectionSeed.colorHex ? { colorHex: sectionSeed.colorHex } : {}),
        },
      });

      const seats = generateSeatsForSection(
        sectionSeed.rowsCount,
        sectionSeed.seatsPerRow,
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
}

// Emite um ticket "pronto" (reserva já paga) direto no banco, sem passar
// pelo fluxo de hold/pagamento — só para o avaliador já ter o que precisa
// pra testar a portaria sem simular uma compra inteira antes. Idempotente:
// se o assento já tem ticket (rodada anterior do seed), não faz nada.
async function seedTicket(params: {
  eventId: string;
  sectionName: string;
  seatLabel: string;
  ownerId: string;
  status: TicketStatus;
  usedByGateUserId?: string;
  secret: string;
}) {
  const seat = await prisma.seat.findFirst({
    where: {
      eventId: params.eventId,
      label: params.seatLabel,
      section: { name: params.sectionName },
    },
    include: { ticket: true, section: true },
  });
  if (!seat || seat.ticket) return;

  await prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.create({
      data: {
        eventId: params.eventId,
        seatId: seat.id,
        customerId: params.ownerId,
        status: 'PAID',
        totalCents: seat.section.priceCents,
        paymentCardLast4: '4242',
      },
    });

    const ticketId = randomUUID();
    const serial = generateSerial();
    const qrToken = signTicketQr(
      { ticketId, eventId: params.eventId, serial },
      params.secret,
    );

    await tx.ticket.create({
      data: {
        id: ticketId,
        reservationId: reservation.id,
        eventId: params.eventId,
        seatId: seat.id,
        ownerId: params.ownerId,
        serial,
        qrToken,
        shortCode: generateShortCode(),
        shareSlug: generateShareSlug(),
        status: params.status,
        ...(params.status === 'USED'
          ? { usedAt: new Date(), usedByGateUserId: params.usedByGateUserId }
          : {}),
      },
    });

    await tx.seat.update({ where: { id: seat.id }, data: { status: 'SOLD' } });
  });
}

async function main() {
  const organizer = await upsertUser(
    'organizador@elitedev.dev',
    'Organizador Padrão',
    Role.ORGANIZER,
  );
  const customer1 = await upsertUser(
    'cliente1@elitedev.dev',
    'Cliente Um',
    Role.CUSTOMER,
  );
  const customer2 = await upsertUser(
    'cliente2@elitedev.dev',
    'Cliente Dois',
    Role.CUSTOMER,
  );
  const gateStaff = await upsertUser(
    'portaria@elitedev.dev',
    'Atendente de Portaria',
    Role.GATE_STAFF,
  );

  const [festival, classico] = await Promise.all(
    EVENT_SEEDS.map((seed) => upsertPublishedEvent(organizer.id, seed)),
  );

  // QR_SIGNING_SECRET precisa estar no ambiente de quem roda o seed — em
  // produção (Railway) já vem do próprio processo; localmente, rodar via
  // `npm run db:seed` (que agora delega pra `prisma db seed`, que carrega
  // o .env automaticamente).
  const secret = process.env.QR_SIGNING_SECRET;
  if (secret) {
    // Ticket válido no Festival — o caso feliz, pronto pra portaria
    // aprovar de primeira.
    await seedTicket({
      eventId: festival.id,
      sectionName: 'Pista',
      seatLabel: 'A1',
      ownerId: customer1.id,
      status: TicketStatus.VALID,
      secret,
    });

    // Ticket já utilizado no Festival — demonstra ALREADY_USED sem precisar
    // validar duas vezes na mão.
    await seedTicket({
      eventId: festival.id,
      sectionName: 'Pista',
      seatLabel: 'A2',
      ownerId: customer1.id,
      status: TicketStatus.USED,
      usedByGateUserId: gateStaff.id,
      secret,
    });

    // Ticket válido no Clássico — usado pra demonstrar WRONG_EVENT quando
    // validado na sessão de portaria do Festival.
    await seedTicket({
      eventId: classico.id,
      sectionName: 'Arquibancada',
      seatLabel: 'A1',
      ownerId: customer2.id,
      status: TicketStatus.VALID,
      secret,
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      'QR_SIGNING_SECRET não encontrado no ambiente — pulando emissão dos tickets de demonstração (usuários e eventos foram semeados normalmente).',
    );
  }

  // eslint-disable-next-line no-console
  console.log('Seed concluído:', {
    organizer: organizer.email,
    customer1: customer1.email,
    customer2: customer2.email,
    gateStaff: gateStaff.email,
    senha: SEED_PASSWORD,
    eventos: [festival.title, classico.title],
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
