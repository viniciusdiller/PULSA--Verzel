"use client";

import { useMemo, useState } from "react";
import { EventCarousel } from "@/components/events/event-carousel";
import { EventFilters } from "@/components/home/event-filters";
import { Input } from "@/components/ui/input";
import type { EventSummary } from "@/types/event";

// Mesmo filtro (cidade + categoria) da seção "Eventos em cartaz" logo
// acima, só que aplicado exclusivamente aos eventos importados da fonte
// TMDB — um eixo de navegação diferente do CategorySections (que agrupa
// TODOS os eventos publicados por gênero/segmento, filme incluso). Um
// filme pode aparecer aqui E de novo na seção da própria categoria dele
// lá embaixo (ex. "Ação") — não é duplicidade, são dois recortes
// diferentes da mesma lista.
//
// Busca é 100% client-side (filtra o texto no título, sem chamada de
// rede) — diferente do campo de busca da seção de cima, que bate na
// API: o universo de filmes já está inteiro em memória (mesmo `events`
// que a home já buscou pra tudo mais), então uma segunda requisição só
// pra isso seria complexidade sem ganho.
export function MoviesSection({ events }: { events: EventSummary[] }) {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const movies = useMemo(
    () => events.filter((event) => event.externalSource === "TMDB"),
    [events],
  );

  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const movie of movies) {
      counts.set(movie.venueCity, (counts.get(movie.venueCity) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [movies]);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const movie of movies) {
      if (!movie.category) continue;
      counts.set(movie.category, (counts.get(movie.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return movies.filter((movie) => {
      if (term && !movie.title.toLowerCase().includes(term)) return false;
      if (selectedCity && movie.venueCity !== selectedCity) return false;
      if (selectedCategory && movie.category !== selectedCategory) return false;
      return true;
    });
  }, [movies, search, selectedCity, selectedCategory]);

  // Sem filme publicado ainda — a seção nem aparece (mesmo padrão do
  // CategorySections: nunca mostra um estado vazio de "não tem nada
  // aqui" pra uma seção que é só um recorte da lista principal).
  if (movies.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading mb-6 text-2xl font-bold">Filmes</h2>

      <div className="mb-6 space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título do filme..."
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

      {filteredMovies.length > 0 ? (
        <EventCarousel events={filteredMovies} />
      ) : (
        <p className="text-muted-foreground">Nenhum filme encontrado para esse filtro.</p>
      )}
    </div>
  );
}
