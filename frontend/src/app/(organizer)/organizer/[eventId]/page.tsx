"use client";

import { use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { useMyEventsQuery, usePublishEventMutation } from "@/hooks/use-organizer-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { formatCentsToBRL, formatEventDateTime } from "@/lib/format";

export default function OrganizerEventDetailPage(props: PageProps<"/organizer/[eventId]">) {
  const { eventId } = use(props.params);
  const { data: events, isLoading } = useMyEventsQuery();
  const publishMutation = usePublishEventMutation();
  const event = events?.find((e) => e.id === eventId);

  async function handlePublish() {
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

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <PageLoader />
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Evento não encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/organizer">Voltar</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href="/organizer" className="text-sm text-muted-foreground hover:underline">
        ← Meus eventos
      </Link>

      <div className="mt-4 mb-6 flex items-center gap-3">
        <h1 className="font-heading text-3xl">{event.title}</h1>
        <Badge variant={event.status === "PUBLISHED" ? "default" : "secondary"}>
          {event.status === "DRAFT" ? "Rascunho" : event.status === "PUBLISHED" ? "Publicado" : "Cancelado"}
        </Badge>
      </div>

      <p className="text-muted-foreground">
        {event.venueName}, {event.venueCity} — {formatEventDateTime(event.startsAt)}
      </p>
      <p className="mt-4 max-w-xl leading-relaxed">{event.description}</p>

      <div className="mt-8 space-y-2">
        <h2 className="font-heading text-xl">Setores (capacidade: {event.capacity})</h2>
        {event.sections.map((section) => (
          <div
            key={section.id}
            className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3"
          >
            <span>
              {section.name} ({section.rowsCount}×{section.seatsPerRow})
            </span>
            <span className="text-muted-foreground">{formatCentsToBRL(section.priceCents)}</span>
          </div>
        ))}
      </div>

      {event.status === "DRAFT" && (
        <Button size="lg" className="mt-8" disabled={publishMutation.isPending} onClick={handlePublish}>
          {publishMutation.isPending ? "Publicando..." : "Publicar evento"}
        </Button>
      )}
      {event.status === "PUBLISHED" && (
        <Button asChild size="lg" variant="outline" className="mt-8">
          <Link href={`/events/${event.id}`}>Ver página pública</Link>
        </Button>
      )}
    </main>
  );
}
