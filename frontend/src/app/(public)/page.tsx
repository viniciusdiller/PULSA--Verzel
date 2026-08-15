"use client";

import { useMemo, useState } from "react";
import { useEventsQuery, useFeaturedEventsQuery } from "@/hooks/use-events";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import { EventCarousel } from "@/components/events/event-carousel";
import { HeroEvent } from "@/components/home/hero-event";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import { CategorySections } from "@/components/home/category-sections";
import { EventFilters } from "@/components/home/event-filters";
import { TrustSection } from "@/components/home/trust-section";
import { CtaBand } from "@/components/home/cta-band";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";

export default function EventsListPage() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // O campo de texto continua instantâneo (`search`), só a busca de
  // verdade espera uma pausa na digitação — evita 1 requisição por tecla.
  const debouncedSearch = useDebouncedValue(search, 450);

  // Duas buscas: uma só com o texto (fonte do hero, das opções de
  // cidade/categoria do filtro, e das seções por categoria — pra não
  // sumir com as outras opções quando uma já está selecionada) e outra
  // com texto+cidade (a base da grade, o filtro de categoria é aplicado
  // em cima dela no cliente — não existe endpoint de busca por
  // categoria hoje, e a lista já vem inteira mesmo assim).
  const { data: allData, isLoading: allLoading } = useEventsQuery(debouncedSearch);
  const { data: filteredData, isLoading: filteredLoading, isError } = useEventsQuery(
    debouncedSearch,
    selectedCity ?? undefined,
  );
  const { data: featuredEvents } = useFeaturedEventsQuery();
  const { user } = useAuth();

  const isBrowsingUnfiltered = !debouncedSearch && !selectedCity && !selectedCategory;

  const displayedEvents = useMemo(() => {
    if (!filteredData) return [];
    if (!selectedCategory) return filteredData.items;
    return filteredData.items.filter((event) => event.category === selectedCategory);
  }, [filteredData, selectedCategory]);

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of allData?.items ?? []) {
      counts.set(event.venueCity, (counts.get(event.venueCity) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allData]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of allData?.items ?? []) {
      if (!event.category) continue;
      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allData]);

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
        <EventFilters
          cities={cityOptions}
          categories={categoryOptions}
          selectedCity={selectedCity}
          selectedCategory={selectedCategory}
          searchTerm={search}
          onChangeCity={setSelectedCity}
          onChangeCategory={setSelectedCategory}
          onClearSearch={() => setSearch("")}
          onClearAll={() => {
            setSearch("");
            setSelectedCity(null);
            setSelectedCategory(null);
          }}
        />
      </div>

      {isBrowsingUnfiltered && featuredEvents && featuredEvents.length > 0 && (
        <FeaturedCarousel events={featuredEvents} />
      )}
      {heroEvent && <HeroEvent event={heroEvent} />}

      <div>
        <h2 className="font-heading mb-6 text-2xl font-bold">Eventos em cartaz</h2>

        {isLoading ? (
          <PageLoader label="Carregando eventos..." />
        ) : isError ? (
          <p className="text-muted-foreground">
            Não foi possível carregar os eventos agora. Tente novamente em instantes.
          </p>
        ) : displayedEvents.length > 0 ? (
          <EventCarousel events={displayedEvents} />
        ) : (
          <p className="text-muted-foreground">
            {search || selectedCity || selectedCategory
              ? "Nenhum evento encontrado para esse filtro."
              : "Nenhum evento publicado ainda."}
          </p>
        )}
      </div>

      {isBrowsingUnfiltered && allData && <CategorySections events={allData.items} />}

      <TrustSection />
      {!user && <CtaBand />}
    </main>
  );
}
