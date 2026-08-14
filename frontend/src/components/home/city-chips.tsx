"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { EventSummary } from "@/types/event";

// Cidades reais agregadas a partir dos eventos publicados (não é lista
// estática) — clicar filtra de verdade via GET /events?city=, parâmetro
// que o backend já suporta e que o frontend nunca usava até agora.
export function CityChips({
  events,
  selectedCity,
  onSelectCity,
}: {
  events: EventSummary[];
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
}) {
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      counts.set(event.venueCity, (counts.get(event.venueCity) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  if (cities.length < 2) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCity === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelectCity(null)}
      >
        Todas as cidades
      </Button>
      {cities.map(([city, count]) => (
        <Button
          key={city}
          variant={selectedCity === city ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectCity(selectedCity === city ? null : city)}
        >
          {city} <span className="ml-1 opacity-70">({count})</span>
        </Button>
      ))}
    </div>
  );
}
