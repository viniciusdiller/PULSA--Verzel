import { Armchair, Clock3, User } from "lucide-react";
import { formatEventDateTime } from "@/lib/format";
import type { GateHistoryTicketItem } from "@/types/gate";

// Linha de ingresso reutilizada tanto na prévia (dentro do card do
// evento) quanto na lista completa (dentro do dialog "Ver todos").
export function GateHistoryTicketRow({ ticket }: { ticket: GateHistoryTicketItem }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <Armchair className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{ticket.seatLabel}</span>
        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <User className="size-3.5 shrink-0" />
          <span className="truncate">{ticket.ownerName}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono tracking-wider">
          {ticket.shortCode}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Clock3 className="size-3.5" />
          {ticket.usedAt ? formatEventDateTime(ticket.usedAt) : ""}
        </span>
      </div>
    </div>
  );
}
