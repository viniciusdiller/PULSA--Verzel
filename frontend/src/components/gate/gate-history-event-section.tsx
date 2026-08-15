"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { GateHistoryTicketRow } from "./gate-history-ticket-row";
import { GateHistoryTicketsDialog } from "./gate-history-tickets-dialog";
import { useGateHistoryTicketsQuery } from "@/hooks/use-gate";
import { formatEventDateTime } from "@/lib/format";
import type { GateHistoryEventSummary } from "@/types/gate";

// Só os 4 mais recentes aparecem direto no card — o resto (quando
// existe) fica atrás do botão "Ver todos", que abre um dialog com a
// lista completa paginada (GateHistoryTicketsDialog). Mantém o
// histórico enxuto de rolar quando o atendente já validou dezenas de
// ingressos no mesmo evento.
const PREVIEW_SIZE = 4;

export function GateHistoryEventSection({ event }: { event: GateHistoryEventSummary }) {
  const { data, isLoading } = useGateHistoryTicketsQuery(event.eventId, 1, PREVIEW_SIZE);

  return (
    <Card className="overflow-hidden py-0 shadow-card">
      <div className="flex items-center gap-4 border-b border-border/60 bg-muted/40 p-4">
        <div className="relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="font-heading text-lg">{event.eventTitle.slice(0, 1)}</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading truncate text-lg">{event.eventTitle}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {event.venueCity} • {formatEventDateTime(event.startsAt)}
          </p>
        </div>
        <Badge variant="pink" className="shrink-0">
          {event.validatedCount} validado{event.validatedCount === 1 ? "" : "s"}
        </Badge>
      </div>

      <CardContent className="py-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <LoaderSignalBars size="sm" />
            Carregando...
          </div>
        ) : (
          <div className="space-y-2">
            {data?.items.map((ticket) => (
              <GateHistoryTicketRow key={ticket.ticketId} ticket={ticket} />
            ))}
          </div>
        )}

        {event.validatedCount > PREVIEW_SIZE && (
          <div className="mt-3 flex justify-center">
            <GateHistoryTicketsDialog event={event} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
