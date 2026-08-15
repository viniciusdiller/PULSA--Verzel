"use client";

import { useMemo, useState } from "react";
import { useEventsQuery, useFeaturedEventsQuery } from "@/hooks/use-events";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { EventCard } from "@/components/events/event-card";
import { HeroEvent } from "@/components/home/hero-event";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { CategorySections } from "@/components/home/category-sections";
import { CityChips } from "@/components/home/city-chips";
import { TrustSection } from "@/components/home/trust-section";
import { CtaBand } from "@/components/home/cta-band";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";

export default function EventsListPage() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  // O campo de texto continua instantâneo (`search`), só a busca de
  // verdade espera uma pausa na digitação — evita 1 requisição por tecla.
  const debouncedSearch = useDebouncedValue(search, 450);

  // Duas buscas: uma só com o texto (fonte do hero e das cidades reais
  // disponíveis, pra não sumir com as outras opções de cidade quando uma
  // já está selecionada) e outra com texto+cidade (a grade de fato).
  const { data: allData, isLoading: allLoading } = useEventsQuery(debouncedSearch);
  const { data: filteredData, isLoading: filteredLoading, isError } = useEventsQuery(
    debouncedSearch,
    selectedCity ?? undefined,
  );
  const { data: featuredEvents } = useFeaturedEventsQuery();

  const isBrowsingUnfiltered = !debouncedSearch && !selectedCity;

  const heroEvent = useMemo(() => {
    // A curadoria manual (featuredEvents) tem prioridade sobre a
    // heurística de "evento mais próximo" — só cai pro heurístico quando
    // nenhum organizador destacou nada ainda.
    if (!isBrowsingUnfiltered || (featuredEvents && featuredEvents.length > 0)) return null;
    return allData?.items[0] ?? null;
  }, [allData, isBrowsingUnfiltered, featuredEvents]);

  const isLoading = allLoading || filteredLoading;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-16 px-6 py-12">
      <div className="space-y-3">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Plataforma de eventos e ingressos
        </p>
        <h1 className="font-heading text-4xl font-bold sm:text-5xl">
          Seu próximo show começa aqui
        </h1>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título do evento..."
          className="max-w-sm"
        />
      </div>

      {isBrowsingUnfiltered && featuredEvents && featuredEvents.length > 0 && (
        <FeaturedCarousel events={featuredEvents} />
      )}
      {heroEvent && <HeroEvent event={heroEvent} />}

      {allData && allData.items.length > 0 && (
        <CityChips
          events={allData.items}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
        />
      )}

      <div>
        <h2 className="font-heading mb-6 text-2xl font-bold">Eventos em cartaz</h2>

        {isLoading ? (
          <PageLoader label="Carregando eventos..." />
        ) : isError ? (
          <p className="text-muted-foreground">
            Não foi possível carregar os eventos agora. Tente novamente em instantes.
          </p>
        ) : filteredData && filteredData.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {filteredData.items.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {search || selectedCity
              ? "Nenhum evento encontrado para esse filtro."
              : "Nenhum evento publicado ainda."}
          </p>
        )}
      </div>

      {isBrowsingUnfiltered && allData && <CategorySections events={allData.items} />}

      <TrustSection />
      <CtaBand />
    </main>
  );
}
