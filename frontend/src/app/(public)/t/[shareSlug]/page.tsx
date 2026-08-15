"use client";

import { use } from "react";
import { useTicketByShareSlugQuery } from "@/hooks/use-tickets";
import { TicketCard } from "@/components/tickets/ticket-card";
import { PageLoader } from "@/components/ui/page-loader";

export default function SharedTicketPage(props: PageProps<"/t/[shareSlug]">) {
  const { shareSlug } = use(props.params);
  const { data: ticket, isLoading, isError } = useTicketByShareSlugQuery(shareSlug);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
        <PageLoader label="Carregando ingresso..." />
      </main>
    );
  }

  if (isError || !ticket) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Ingresso não encontrado</h1>
        <p className="text-muted-foreground">Este link pode estar incorreto ou ter expirado.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <p className="mb-6 text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
        Ingresso compartilhado
      </p>
      <TicketCard ticket={ticket} showShareButton={false} />
    </main>
  );
}
