"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useExportGateHistoryCsv,
  useGateHistoryEventsQuery,
} from "@/hooks/use-gate";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { GateHistoryEventSection } from "@/components/gate/gate-history-event-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { downloadBlob } from "@/lib/download-file";

const PAGE_SIZE = 4;

export default function GateHistoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data, isLoading, isPlaceholderData } = useGateHistoryEventsQuery(
    page,
    PAGE_SIZE,
    debouncedSearch,
  );
  const exportMutation = useExportGateHistoryCsv();
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasSearch = search.trim().length > 0;
  const hasAnyEvents = !!data && data.total > 0;

  function handleSearchChange(value: string) {
    setSearch(value);
    // Volta pra página 1 sempre que a busca muda — senão dava pra ficar
    // "preso" numa página sem nenhum evento que bate com o filtro.
    setPage(1);
  }

  async function handleExport() {
    try {
      const blob = await exportMutation.mutateAsync(search.trim());
      const today = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `pulsa-validacoes-${today}.csv`);
      toast.success("Histórico exportado com sucesso.");
    } catch {
      toast.error("Não foi possível exportar o histórico.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
        Portaria
      </p>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl">Histórico de validações</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consulte e baixe as entradas que você liberou.
          </p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 gap-2"
          disabled={exportMutation.isPending || !hasAnyEvents}
          onClick={() => void handleExport()}
        >
          <Download className="size-4" />
          {exportMutation.isPending ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar evento por nome..."
          aria-label="Buscar evento por nome"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <PageLoader label="Carregando histórico..." />
      ) : data && data.items.length > 0 ? (
        <div
          className={isPlaceholderData ? "space-y-6 opacity-60" : "space-y-6"}
        >
          {data.items.map((event) => (
            <GateHistoryEventSection key={event.eventId} event={event} />
          ))}
        </div>
      ) : hasSearch ? (
        <p className="text-muted-foreground">
          Nenhum evento encontrado para essa busca.
        </p>
      ) : (
        <p className="text-muted-foreground">
          Você ainda não validou nenhum ingresso.{" "}
          <Link href="/gate" className="underline">
            Ir para a portaria
          </Link>
          .
        </p>
      )}

      {!isLoading && data && data.total > PAGE_SIZE && (
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
