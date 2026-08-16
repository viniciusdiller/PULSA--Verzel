"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Wallet } from "lucide-react";
import { useMyEventsQuery, usePublishEventMutation } from "@/hooks/use-organizer-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { PageLoader } from "@/components/ui/page-loader";
import { formatCentsToBRL, formatEventDateTime } from "@/lib/format";
import type { EventStatus } from "@/types/event";

const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  CANCELED: "Cancelado",
};

const STATUS_VARIANT: Record<EventStatus, "secondary" | "success" | "destructive"> = {
  DRAFT: "secondary",
  PUBLISHED: "success",
  CANCELED: "destructive",
};

const PAGE_SIZE = 10;

const STATUS_FILTERS: { label: string; value?: EventStatus }[] = [
  { label: "Todos", value: undefined },
  { label: "Rascunho", value: "DRAFT" },
  { label: "Publicado", value: "PUBLISHED" },
  { label: "Cancelado", value: "CANCELED" },
];

export default function OrganizerDashboardPage() {
  const [status, setStatus] = useState<EventStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, isLoading, isPlaceholderData } = useMyEventsQuery({ status, page, pageSize: PAGE_SIZE });
  const publishMutation = usePublishEventMutation();
  const events = data?.items;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function handleStatusChange(next: EventStatus | undefined) {
    setStatus(next);
    setPage(1);
  }

  async function handlePublish(eventId: string) {
    try {
      await publishMutation.mutateAsync(eventId);
      toast.success("Evento publicado.");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível publicar o evento.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Organizador</p>
          <h1 className="font-heading text-3xl">Meus eventos</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/organizer/finance">
              <Wallet className="size-4" />
              Financeiro
            </Link>
          </Button>
          <Button asChild>
            <Link href="/organizer/new">+ Novo evento</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={status === filter.value ? "default" : "outline"}
            onClick={() => handleStatusChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <PageLoader label="Carregando seus eventos..." />
      ) : events && events.length > 0 ? (
        <div className={isPlaceholderData ? "space-y-3 opacity-60" : "space-y-3"}>
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-md border border-border/60 p-4 transition-colors hover:border-foreground/30"
            >
              <Link href={`/organizer/${event.id}`} className="min-w-0 flex-1 hover:cursor-pointer">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="font-heading text-lg">{event.title}</h2>
                  <Badge variant={STATUS_VARIANT[event.status]} className="mt-1 shrink-0">
                    {STATUS_LABEL[event.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.venueCity} • {formatEventDateTime(event.startsAt)} • capacidade{" "}
                  {event.capacity} • a partir de {formatCentsToBRL(event.fromPriceCents)}
                </p>
              </Link>
              {event.status === "DRAFT" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={publishMutation.isPending}
                  onClick={() => handlePublish(event.id)}
                >
                  {publishMutation.isPending ? (
                    <>
                      <LoaderSignalBars size="sm" className="mr-1.5" />
                      Publicando...
                    </>
                  ) : (
                    "Publicar"
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : status ? (
        <p className="text-muted-foreground">
          Nenhum evento com status &quot;{STATUS_LABEL[status]}&quot;.
        </p>
      ) : (
        <p className="text-muted-foreground">
          Você ainda não criou nenhum evento.{" "}
          <Link href="/organizer/new" className="underline">
            Criar o primeiro
          </Link>
          .
        </p>
      )}

      {!isLoading && data && data.total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} • {data.total} evento{data.total === 1 ? "" : "s"}
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
