import type { Metadata } from "next";
import { EventDetailClient } from "./event-detail-client";
import { formatCentsToBRL } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

interface EventForMetadata {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  fromPriceCents: number;
}

// Página do evento é a única com valor real de SEO individual (a home é
// genérica, o resto exige login) — sem isso, toda página do site aparecia
// no Google com o mesmo título/descrição do layout raiz.
async function fetchEvent(eventId: string): Promise<EventForMetadata | null> {
  try {
    const res = await fetch(`${API_URL}/events/${eventId}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as EventForMetadata;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  props: PageProps<"/events/[eventId]">,
): Promise<Metadata> {
  const { eventId } = await props.params;
  const event = await fetchEvent(eventId);
  if (!event) return {};

  const title = `${event.title} — ${event.venueCity} | PULSA`;
  const description = `${event.venueName}, ${event.venueCity}. A partir de ${formatCentsToBRL(event.fromPriceCents)}. ${event.description}`.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: event.imageUrl ? [event.imageUrl] : undefined,
    },
  };
}

export default async function EventDetailPage(props: PageProps<"/events/[eventId]">) {
  const { eventId } = await props.params;
  const event = await fetchEvent(eventId);

  // Schema.org Event — habilita o rich result do Google (data, local,
  // preço direto no resultado de busca, sem precisar entrar no site).
  // dangerouslySetInnerHTML aqui é seguro: o conteúdo vem só de campos
  // que nós mesmos buscamos da API (não de input de usuário renderizado
  // como HTML), e JSON.stringify escapa tudo antes de virar string.
  const jsonLd = event
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.title,
        startDate: event.startsAt,
        location: {
          "@type": "Place",
          name: event.venueName,
          address: `${event.venueAddress}, ${event.venueCity}`,
        },
        image: event.imageUrl ?? undefined,
        description: event.description,
        offers: {
          "@type": "Offer",
          price: (event.fromPriceCents / 100).toFixed(2),
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EventDetailClient eventId={eventId} />
    </>
  );
}
