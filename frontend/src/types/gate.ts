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
