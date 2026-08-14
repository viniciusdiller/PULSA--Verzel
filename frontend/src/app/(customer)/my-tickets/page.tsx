"use client";

import Link from "next/link";
import { useMyTicketsQuery } from "@/hooks/use-tickets";
import { TicketCard } from "@/components/tickets/ticket-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyTicketsPage() {
  const { data: tickets, isLoading } = useMyTicketsQuery();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Cliente</p>
      <h1 className="font-heading mb-8 text-3xl">Meus ingressos</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : tickets && tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          Você ainda não tem ingressos.{" "}
          <Link href="/" className="underline">
            Ver eventos em cartaz
          </Link>
          .
        </p>
      )}
    </main>
  );
}
