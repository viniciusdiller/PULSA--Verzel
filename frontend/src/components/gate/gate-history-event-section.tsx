"use client";

import { useState } from "react";
import Image from "next/image";
import { Armchair, Clock3, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
        <Badge variant="violet" className="shrink-0">
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
          <div className={isPlaceholderData ? "space-y-2 opacity-60" : "space-y-2"}>
            {data?.items.map((ticket) => (
              <div
                key={ticket.ticketId}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
              >
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
