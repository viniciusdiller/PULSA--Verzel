"use client";

import Link from "next/link";
import { useGateHistoryEventsQuery } from "@/hooks/use-gate";
import { GateHistoryEventSection } from "@/components/gate/gate-history-event-section";
import { PageLoader } from "@/components/ui/page-loader";

export default function GateHistoryPage() {
  const { data: events, isLoading } = useGateHistoryEventsQuery();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Portaria</p>
      <h1 className="font-heading mb-8 text-3xl">Histórico de validações</h1>

      {isLoading ? (
        <PageLoader label="Carregando histórico..." />
      ) : events && events.length > 0 ? (
        <div className="space-y-6">
          {events.map((event) => (
            <GateHistoryEventSection key={event.eventId} event={event} />
          ))}
        </div>
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
