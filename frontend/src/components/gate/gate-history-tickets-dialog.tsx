"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { GateHistoryTicketRow } from "./gate-history-ticket-row";
import { useGateHistoryTicketsQuery } from "@/hooks/use-gate";
import type { GateHistoryEventSummary } from "@/types/gate";

const PAGE_SIZE = 10;

// A busca dos ingressos só acontece quando o dialog abre de verdade —
// o Radix Dialog não monta DialogContent enquanto fechado, então o
// useGateHistoryTicketsQuery daqui dentro nem dispara antes do clique.
export function GateHistoryTicketsDialog({ event }: { event: GateHistoryEventSummary }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading, isPlaceholderData } = useGateHistoryTicketsQuery(
    event.eventId,
    page,
    PAGE_SIZE,
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPage(1);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Ver todos ({event.validatedCount})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        {/* Sangra até a borda do card (-mx-4 -mt-4) e reserva espaço à
            direita (pr-12) pro X de fechar, que fica absolute por cima —
            sem isso o título comprido invadia embaixo do botão de fechar. */}
        <DialogHeader className="-mx-4 -mt-4 gap-1 rounded-t-xl border-b border-border/60 bg-muted/40 px-4 py-4 pr-12">
          <DialogTitle className="truncate">{event.eventTitle}</DialogTitle>
          <DialogDescription>
            Todos os ingressos que você validou neste evento.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <LoaderSignalBars size="sm" />
            Carregando...
          </div>
        ) : (
          <div className={isPlaceholderData ? "space-y-2 opacity-60" : "space-y-2"}>
            {data?.items.map((ticket) => (
              <GateHistoryTicketRow key={ticket.ticketId} ticket={ticket} />
            ))}
          </div>
        )}

        {!isLoading && data && data.total > PAGE_SIZE && (
          <div className="mt-2 flex items-center justify-between">
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
      </DialogContent>
    </Dialog>
  );
}
