"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TicketCheck, TrendingUp, Wallet } from "lucide-react";
import { useOrganizerStatsQuery } from "@/hooks/use-organizer-events";
import { PageLoader } from "@/components/ui/page-loader";
import { formatCentsToBRL, formatEventDate } from "@/lib/format";
import type { OrganizerEventStats } from "@/types/event";

// Barra de receita animada em CSS puro (transition-[width]), não motion —
// o valor final depende de maxRevenueCents, que só existe depois que o
// React Query resolve; disparar a transição a partir de um estado
// "montado" (0% no primeiro paint, valor real logo em seguida) é mais
// simples e previsível aqui do que orquestrar initial/animate do motion
// em cima de dados assíncronos.
function RevenueBarRow({
  item,
  maxRevenueCents,
  delayMs,
}: {
  item: OrganizerEventStats;
  maxRevenueCents: number;
  delayMs: number;
}) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setFilled(true), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs]);

  const pct = (item.revenueCents / maxRevenueCents) * 100;

  return (
    <Link
      href={`/organizer/${item.eventId}`}
      className="block rounded-xl border border-border/60 p-4 transition-colors hover:cursor-pointer hover:border-foreground/30"
    >
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.venueCity} • {formatEventDate(item.startsAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-lg text-foreground">
            {formatCentsToBRL(item.revenueCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.ticketsSold} ingresso{item.ticketsSold === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-violet transition-[width] duration-700 ease-out"
          style={{ width: filled ? `${pct}%` : "0%" }}
        />
      </div>
    </Link>
  );
}

export default function OrganizerFinancePage() {
  const { data, isLoading } = useOrganizerStatsQuery();

  if (isLoading || !data) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <PageLoader label="Carregando o painel financeiro..." />
      </main>
    );
  }

  const { items, totals } = data;
  const sortedByRevenue = [...items].sort((a, b) => b.revenueCents - a.revenueCents);
  const maxRevenueCents = Math.max(1, ...items.map((item) => item.revenueCents));
  const averageTicketCents =
    totals.ticketsSold > 0 ? Math.round(totals.revenueCents / totals.ticketsSold) : 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-12">
      <div>
        <Link
          href="/organizer"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:cursor-pointer hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Meus eventos
        </Link>
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Organizador</p>
        <h1 className="font-heading text-3xl">Painel financeiro</h1>
      </div>

      {/* Mesma superfície "documento" (gradiente sutil + divisórias) já
          usada no cartão de perfil, em vez de 3 KPI cards genéricos
          empilhados lado a lado — reaproveita a linguagem visual que a
          marca já estabeleceu pra esse tipo de resumo. */}
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card">
        <div className="bg-gradient-to-br from-violet/15 via-transparent to-primary/10 p-6">
          <p className="text-sm text-muted-foreground">
            Resumo de {totals.eventsCount} evento{totals.eventsCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-border/60 border-t border-border/60 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col items-start gap-1 p-6">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5" />
              Receita total
            </span>
            <span className="font-heading text-2xl text-foreground">
              {formatCentsToBRL(totals.revenueCents)}
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 p-6">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TicketCheck className="size-3.5" />
              Ingressos vendidos
            </span>
            <span className="font-heading text-2xl text-foreground">{totals.ticketsSold}</span>
          </div>
          <div className="flex flex-col items-start gap-1 p-6">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" />
              Ticket médio
            </span>
            <span className="font-heading text-2xl text-foreground">
              {formatCentsToBRL(averageTicketCents)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-heading mb-4 text-xl">Receita por evento</h2>

        {sortedByRevenue.length === 0 ? (
          <p className="text-muted-foreground">
            Você ainda não criou nenhum evento.{" "}
            <Link href="/organizer/new" className="underline">
              Criar o primeiro
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-3">
            {sortedByRevenue.map((item, index) => (
              <RevenueBarRow
                key={item.eventId}
                item={item}
                maxRevenueCents={maxRevenueCents}
                delayMs={50 + index * 50}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
