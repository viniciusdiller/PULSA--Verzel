export type ReservationStatus = "HOLDING" | "PAID" | "DECLINED" | "EXPIRED" | "CANCELED";

export interface Reservation {
  id: string;
  eventId: string;
  seatId: string;
  customerId: string;
  status: ReservationStatus;
  holdExpiresAt: string | null;
  totalCents: number;
  balanceAppliedCents: number;
  paymentCardLast4: string | null;
  paymentDeclineReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  reservationId: string;
  eventId: string;
  seatId: string;
  ownerId: string;
  serial: string;
  qrToken: string;
  shortCode: string;
  status: "VALID" | "USED" | "VOID";
  usedAt: string | null;
  usedByGateUserId: string | null;
  shareSlug: string;
  createdAt: string;
}

export interface PayResult {
  reservation: Reservation;
  ticket: Ticket | null;
}
