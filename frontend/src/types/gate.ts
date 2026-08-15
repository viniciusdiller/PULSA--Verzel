export type GateOutcome = "VALID" | "INVALID" | "ALREADY_USED" | "WRONG_EVENT";

export interface GateTicketSummary {
  ticketId: string;
  seatLabel: string;
  eventTitle: string;
}

export interface GateValidationResult {
  outcome: GateOutcome;
  message: string;
  ticket?: GateTicketSummary;
  usedAt?: string | null;
  usedByGateUserId?: string | null;
}

export interface GateHistoryEventSummary {
  eventId: string;
  eventTitle: string;
  imageUrl: string | null;
  venueCity: string;
  startsAt: string;
  validatedCount: number;
  lastValidatedAt: string | null;
}

export interface GateHistoryTicketItem {
  ticketId: string;
  seatLabel: string;
  ownerName: string;
  usedAt: string | null;
  shortCode: string;
}

export interface GateHistoryTicketsPage {
  items: GateHistoryTicketItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GateHistoryEventsPage {
  items: GateHistoryEventSummary[];
  total: number;
  page: number;
  pageSize: number;
}
