"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { useGateHistoryTicketsQuery } from "@/hooks/use-gate";
import { formatEventDateTime } from "@/lib/format";
import type { GateHistoryEventSummary } from "@/types/gate";

const PAGE_SIZE = 10;

// Cada evento tem sua própria página/estado — o histórico mostra vários
// desses lado a lado, um por evento validado, cada um paginando
// independentemente (só mostra os controles quando o próprio evento
// passa de PAGE_SIZE ingressos, não o histórico inteiro).
export function GateHistoryEventSection({ event }: { event: GateHistoryEventSummary }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isPlaceholderData } = useGateHistoryTicketsQuery(
    event.eventId,
    page,
    PAGE_SIZE,
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg">{event.eventTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {event.venueCity} • {formatEventDateTime(event.startsAt)}
            </p>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {event.validatedCount} validado{event.validatedCount === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <LoaderSignalBars size="sm" />
            Carregando...
          </div>
        ) : (
          <div className={isPlaceholderData ? "space-y-2 opacity-60" : "space-y-2"}>
            {data?.items.map((ticket) => (
              <div
                key={ticket.ticketId}
                className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{ticket.seatLabel}</span>
                  <span className="text-muted-foreground"> — {ticket.ownerName}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{ticket.shortCode}</span>
                  <span>{ticket.usedAt ? formatEventDateTime(ticket.usedAt) : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data && data.total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
