"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useGateHistoryEventsQuery } from "@/hooks/use-gate";
import { GateHistoryEventSection } from "@/components/gate/gate-history-event-section";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";

export default function GateHistoryPage() {
  const { data: events, isLoading } = useGateHistoryEventsQuery();
  const [search, setSearch] = useState("");

  // Filtro no cliente, não no servidor: a lista de eventos do histórico
  // já vem inteira de uma vez (é só um evento por linha, não os
  // ingressos em si — esses sim são paginados por evento), então não
  // vale a pena um roundtrip extra só pra filtrar por nome.
  const filteredEvents = useMemo(() => {
    if (!events) return events;
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => event.eventTitle.toLowerCase().includes(term));
  }, [events, search]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Portaria</p>
      <h1 className="font-heading mb-6 text-3xl">Histórico de validações</h1>

      {events && events.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar evento por nome..."
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <PageLoader label="Carregando histórico..." />
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="space-y-6">
          {filteredEvents.map((event) => (
            <GateHistoryEventSection key={event.eventId} event={event} />
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <p className="text-muted-foreground">Nenhum evento encontrado para essa busca.</p>
      ) : (
        <p className="text-muted-foreground">
          Você ainda não validou nenhum ingresso.{" "}
          <Link href="/gate" className="underline">
            Ir para a portaria
          </Link>
          .
        </p>
      )}
    </main>
  );
}
