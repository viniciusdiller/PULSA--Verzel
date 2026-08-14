"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { useEventQuery } from "@/hooks/use-events";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCentsToBRL, formatEventDateTime } from "@/lib/format";

export default function EventDetailPage(props: PageProps<"/events/[eventId]">) {
  const { eventId } = use(props.params);
  const { data: event, isLoading, isError } = useEventQuery(eventId);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <Skeleton className="mb-6 aspect-video w-full" />
        <Skeleton className="mb-2 h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </main>
    );
  }

  if (isError || !event) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Evento não encontrado</h1>
        <p className="text-muted-foreground">
          Ele pode não existir mais ou ainda não ter sido publicado.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/">Voltar para eventos</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      {event.imageUrl && (
        <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
        </div>
      )}

      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
        {event.venueCity} • {formatEventDateTime(event.startsAt)}
      </p>
      <h1 className="font-heading mt-2 text-4xl">{event.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {event.venueName} — {event.venueAddress}
      </p>

      <p className="mt-6 max-w-2xl leading-relaxed">{event.description}</p>

      <div className="mt-8 space-y-2">
        <h2 className="font-heading text-xl">Setores</h2>
        {event.sections.map((section) => (
          <div
            key={section.id}
            className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3"
          >
            <span>{section.name}</span>
            <span className="text-muted-foreground">{formatCentsToBRL(section.priceCents)}</span>
          </div>
        ))}
      </div>

      <Button asChild size="lg" className="mt-8">
        <Link href={`/events/${event.id}/checkout`}>Escolher assento</Link>
      </Button>
    </main>
  );
}
