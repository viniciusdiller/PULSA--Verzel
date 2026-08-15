"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useGateHistoryEventsQuery } from "@/hooks/use-gate";
import { GateHistoryEventSection } from "@/components/gate/gate-history-event-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";

const PAGE_SIZE = 4;

export default function GateHistoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isPlaceholderData } = useGateHistoryEventsQuery(page, PAGE_SIZE);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function handleSearchChange(value: string) {
    setSearch(value);
    // Volta pra página 1 sempre que a busca muda — senão dava pra ficar
    // "preso" numa página sem nenhum evento que bate com o filtro.
    setPage(1);
  }

  // Filtro no cliente, dentro da página atual: a lista de eventos do
  // histórico agora é paginada no servidor (poucos eventos por página),
  // então buscar "em tudo" exigiria um parâmetro de busca à parte no
  // endpoint — não implementado ainda porque, na prática, um atendente
  // raramente valida ingresso de dezenas de eventos diferentes.
  const filteredItems = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();
    if (!term) return data.items;
    return data.items.filter((event) => event.eventTitle.toLowerCase().includes(term));
  }, [data, search]);

  const hasAnyEvents = !!data && data.total > 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Portaria</p>
      <h1 className="font-heading mb-6 text-3xl">Histórico de validações</h1>

      {hasAnyEvents && (
        <div className="relative mb-6 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar evento por nome..."
            className="pl-9"
          />
        </div>
      )}

      {isLoading ? (
        <PageLoader label="Carregando histórico..." />
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className={isPlaceholderData ? "space-y-6 opacity-60" : "space-y-6"}>
          {filteredItems.map((event) => (
            <GateHistoryEventSection key={event.eventId} event={event} />
          ))}
        </div>
      ) : hasAnyEvents ? (
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

      {!isLoading && !search && data && data.total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
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
    </main>
  );
}
