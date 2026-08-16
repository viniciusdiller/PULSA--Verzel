"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { TicketCard } from "@/components/tickets/ticket-card";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMyTicketsQuery } from "@/hooks/use-tickets";
import type { Ticket as TicketType } from "@/types/ticket";

const PAGE_SIZE = 4;
type Tab = "active" | "past";

type EventGroup = {
  eventId: string;
  title: string;
  imageUrl?: string | null;
  venueName?: string | null;
  city?: string | null;
  startsAt?: string | null;
  tickets: TicketType[];
};

function groupTicketsByEvent(tickets: TicketType[]): EventGroup[] {
  const groups = new Map<string, EventGroup>();

  for (const ticket of tickets) {
    const event = ticket.event;
    if (!event) continue;

    const existing = groups.get(event.id);
    if (existing) {
      existing.tickets.push(ticket);
      continue;
    }

    groups.set(event.id, {
      eventId: event.id,
      title: event.title,
      imageUrl: event.imageUrl,
      venueName: event.venueName,
      city: event.city,
      startsAt: event.startsAt,
      tickets: [ticket],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aDate = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const bDate = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return aDate - bDate;
  });
}

function formatEventDate(value?: string | null) {
  if (!value) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MyTicketsPage() {
  const { data: tickets, isLoading, isError } = useMyTicketsQuery();
  const [tab, setTab] = useState<Tab>("active");
  const [page, setPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((ticket) =>
      tab === "active" ? ticket.status === "VALID" : ticket.status !== "VALID",
    );
  }, [tickets, tab]);

  const eventGroups = useMemo(
    () => groupTicketsByEvent(filteredTickets),
    [filteredTickets],
  );

  const pageCount = Math.max(1, Math.ceil(eventGroups.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleGroups = eventGroups.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedGroup = eventGroups.find(
    (group) => group.eventId === selectedEventId,
  );

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    setPage(1);
    setSelectedEventId(null);
  }

  if (isLoading) return <PageLoader label="Carregando seus ingressos" />;

  if (isError) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Não foi possível carregar seus ingressos agora.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 pb-24">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
          Sua programação
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Meus ingressos</h1>
        <p className="mt-2 text-muted-foreground">
          Escolha um evento para consultar seus ingressos e códigos QR.
        </p>
      </header>

      <div className="mb-8 flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => changeTab("active")}
          className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
            tab === "active"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Ativos
        </button>
        <button
          type="button"
          onClick={() => changeTab("past")}
          className={`border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
            tab === "past"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Passados
        </button>
      </div>

      {selectedGroup ? (
        <section aria-label={`Ingressos de ${selectedGroup.title}`}>
          <div className="mb-6 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEventId(null)}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar aos eventos
            </Button>
            <div className="h-4 w-px bg-border" />
            <h2 className="truncate text-lg font-semibold">{selectedGroup.title}</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {selectedGroup.tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      ) : eventGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Ticket className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="font-semibold">
                {tab === "active" ? "Nenhum ingresso ativo" : "Nenhum ingresso passado"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab === "active"
                  ? "Seus próximos eventos aparecerão aqui."
                  : "Ingressos usados ou cancelados aparecerão aqui."}
              </p>
            </div>
            {tab === "active" && (
              <Button asChild>
                <Link href="/">Explorar eventos</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            {visibleGroups.map((group) => (
              <button
                key={group.eventId}
                type="button"
                onClick={() => setSelectedEventId(group.eventId)}
                className="group text-left"
              >
                <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:shadow-lg">
                  <div className="relative aspect-[16/8] overflow-hidden bg-muted">
                    {group.imageUrl ? (
                      <img
                        src={group.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Ticket className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-lg font-bold">{group.title}</h2>
                        <p className="mt-1 truncate text-sm text-white/80">
                          {group.venueName || group.city || "Local a confirmar"}
                        </p>
                      </div>
                      <Badge className="shrink-0 border-white/20 bg-white/15 text-white backdrop-blur-sm">
                        {group.tickets.length} {group.tickets.length === 1 ? "ingresso" : "ingressos"}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="text-sm font-medium">{formatEventDate(group.startsAt)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Clique para ver os QR codes
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Próxima
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
