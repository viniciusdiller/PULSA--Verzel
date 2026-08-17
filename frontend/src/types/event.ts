export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELED";
export type SeatStatus = "AVAILABLE" | "HELD" | "SOLD";

export interface Section {
  id: string;
  eventId: string;
  name: string;
  priceCents: number;
  rowsCount: number;
  seatsPerRow: number;
  colorHex: string;
}

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  organizerId: string;
  capacity: number;
  status: EventStatus;
  category: string | null;
  featured: boolean;
  // "TICKETMASTER" | "TMDB" (ou qualquer string — o backend não valida
  // com @IsEnum, ver create-event.dto.ts) — usado pra distinguir filmes
  // de shows na home (ver home/movies-section.tsx).
  externalSource: string;
  sections: Section[];
  fromPriceCents: number;
}

export interface EventListResponse {
  items: EventSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Seat {
  id: string;
  sectionId: string;
  row: string;
  number: number;
  label: string;
  status: SeatStatus;
}

export interface SeatMapResponse {
  event: { id: string; title: string; startsAt: string; externalSource: string };
  sections: Section[];
  seats: Seat[];
}

export interface OrganizerEventStats {
  eventId: string;
  title: string;
  venueCity: string;
  startsAt: string;
  status: EventStatus;
  capacity: number;
  ticketsSold: number;
  revenueCents: number;
}

export interface OrganizerStatsResponse {
  items: OrganizerEventStats[];
  totals: {
    revenueCents: number;
    ticketsSold: number;
    eventsCount: number;
  };
}
