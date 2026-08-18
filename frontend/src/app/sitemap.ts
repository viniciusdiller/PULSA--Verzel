import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://projeto-de-desenvolvimento-verzel.vercel.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

// Regenera no máximo de hora em hora em vez de só na hora do build — sem
// isso, um evento publicado depois do último deploy nunca apareceria aqui.
export const revalidate = 3600;

interface EventListItem {
  id: string;
  updatedAt?: string;
  startsAt: string;
}

// Só eventos publicados têm URL indexável (a rota pública GET /events já
// só devolve esses) — pagina até acabar em vez de assumir um teto fixo.
// Nunca derruba o build/a rota: se a API estiver fora do ar (ex. build
// local sem o backend rodando), devolve só a home em vez de quebrar.
async function fetchAllPublishedEventIds(): Promise<EventListItem[]> {
  const items: EventListItem[] = [];
  let page = 1;
  try {
    while (true) {
      const res = await fetch(`${API_URL}/events?page=${page}&pageSize=50`);
      if (!res.ok) break;
      const data = (await res.json()) as { items: EventListItem[] };
      items.push(...data.items);
      if (data.items.length < 50) break;
      page += 1;
    }
  } catch {
    return items;
  }
  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await fetchAllPublishedEventIds();

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    ...events.map((event) => ({
      url: `${SITE_URL}/events/${event.id}`,
      lastModified: event.updatedAt ?? event.startsAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
