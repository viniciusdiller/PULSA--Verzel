import { EventCard } from "@/components/events/event-card";
import type { EventSummary } from "@/types/event";

// Agrupa os eventos publicados por Event.category — preenchida pelo
// organizador (geralmente puxada automaticamente do "segment" da
// classificação da Ticketmaster ao importar do catálogo, ver
// ticketmaster-mapper.util.ts). Eventos sem categoria não formam uma
// seção "sem categoria" — eles só não aparecem aqui (continuam na grade
// "Eventos em cartaz" de qualquer forma). Pensado para crescer: no dia
// em que a plataforma aceitar outro tipo de catálogo (ex. filmes), a
// categoria vira o eixo natural de organização da home.
export function CategorySections({ events }: { events: EventSummary[] }) {
  const byCategory = new Map<string, EventSummary[]>();
  for (const event of events) {
    if (!event.category) continue;
    const list = byCategory.get(event.category) ?? [];
    list.push(event);
    byCategory.set(event.category, list);
  }

  const categories = Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length);

  if (categories.length === 0) return null;

  return (
    <div className="space-y-12">
      {categories.map(([category, categoryEvents]) => (
        <div key={category}>
          <h2 className="font-heading mb-6 text-2xl font-bold">{category}</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {categoryEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
