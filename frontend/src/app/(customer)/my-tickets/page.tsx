"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { useMyTicketsQuery } from "@/hooks/use-tickets";
import { TicketCard } from "@/components/tickets/ticket-card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketWithDetails } from "@/types/ticket";

const PAGE_SIZE = 4;

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-16 text-center">
      <Ticket className="size-8 text-muted-foreground" />
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

// Paginação client-side: a lista de ingressos de UM cliente é sempre um
// volume pequeno (não é uma listagem paginada no servidor como a de
// eventos/organizador), então buscar tudo de uma vez e paginar em
// memória, por aba, evita criar um endpoint paginado só pra isso.
function TicketsTabPanel({ tickets, emptyMessage }: { tickets: TicketWithDetails[]; emptyMessage: React.ReactNode }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const pageItems = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (tickets.length === 0) {
    return <EmptyState>{emptyMessage}</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {pageItems.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}

      {tickets.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
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
    </div>
  );
}

export default function MyTicketsPage() {
  const { data: tickets, isLoading } = useMyTicketsQuery();

  const { active, past } = useMemo(() => {
    const list = tickets ?? [];
    return {
      active: list.filter((t) => t.status === "VALID"),
      // "Passados" cobre tanto ingresso já utilizado quanto invalidado
      // (evento cancelado) — em ambos os casos não há mais nada a fazer
      // com o ingresso, então faz sentido os dois saírem da aba ativa.
      past: list.filter((t) => t.status === "USED" || t.status === "VOID"),
    };
  }, [tickets]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Cliente</p>
      <h1 className="font-heading mb-8 text-3xl">Meus ingressos</h1>

      {isLoading ? (
        <PageLoader label="Carregando ingressos..." />
      ) : tickets && tickets.length > 0 ? (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Ativos ({active.length})</TabsTrigger>
            <TabsTrigger value="past">Passados ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">
            <TicketsTabPanel
              tickets={active}
              emptyMessage="Você não tem ingressos ativos no momento."
            />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <TicketsTabPanel
              tickets={past}
              emptyMessage="Nenhum ingresso passado por aqui ainda."
            />
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyState>
          Você ainda não tem ingressos.{" "}
          <Link href="/" className="underline">
            Ver eventos em cartaz
          </Link>
          .
        </EmptyState>
      )}
    </main>
  );
}
