"use client";

import Link from "next/link";
import { toast } from "sonner";
import { isAxiosError } from "axios";
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

export default function OrganizerDashboardPage() {
  const { data: events, isLoading } = useMyEventsQuery();
  const publishMutation = usePublishEventMutation();

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Organizador</p>
          <h1 className="font-heading text-3xl">Meus eventos</h1>
        </div>
        <Button asChild>
          <Link href="/organizer/new">+ Novo evento</Link>
        </Button>
      </div>

      {isLoading ? (
        <PageLoader label="Carregando seus eventos..." />
      ) : events && events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-md border border-border/60 p-4"
            >
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="font-heading text-lg">{event.title}</h2>
                  <Badge variant={STATUS_VARIANT[event.status]}>
                    {STATUS_LABEL[event.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.venueCity} • {formatEventDateTime(event.startsAt)} • capacidade{" "}
                  {event.capacity} • a partir de {formatCentsToBRL(event.fromPriceCents)}
                </p>
              </div>
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
      ) : (
        <p className="text-muted-foreground">
          Você ainda não criou nenhum evento.{" "}
          <Link href="/organizer/new" className="underline">
            Criar o primeiro
          </Link>
          .
        </p>
      )}
    </main>
  );
}
