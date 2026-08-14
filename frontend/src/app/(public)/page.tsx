"use client";

import { useState } from "react";
import { useEventsQuery } from "@/hooks/use-events";
import { EventCard } from "@/components/events/event-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventsListPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useEventsQuery(search);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="mb-10 space-y-3">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Plataforma de Eventos e Ingressos
        </p>
        <h1 className="font-heading text-4xl">Eventos em cartaz</h1>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título do evento..."
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-muted-foreground">
          Não foi possível carregar os eventos agora. Tente novamente em instantes.
        </p>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {data.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {search
            ? `Nenhum evento encontrado para "${search}".`
            : "Nenhum evento publicado ainda."}
        </p>
      )}
    </main>
  );
}
