export interface TicketEventInfo {
  id: string;
  title: string;
  imageUrl: string | null;
  startsAt: string;
  venueName: string;
  venueCity: string;
}

export interface TicketSeatInfo {
  id: string;
  row: string;
  number: number;
  label: string;
}

export interface TicketWithDetails {
  id: string;
  reservationId: string;
  eventId: string;
  seatId: string;
  serial: string;
  qrToken: string;
  shortCode: string;
  status: "VALID" | "USED" | "VOID";
  usedAt: string | null;
  usedByGateUserId: string | null;
  shareSlug: string;
  createdAt: string;
  event: TicketEventInfo;
  seat: TicketSeatInfo;
}
