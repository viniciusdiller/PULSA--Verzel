export type CatalogSource = "TICKETMASTER" | "TMDB";

export interface CatalogEvent {
  externalId: string;
  source: CatalogSource;
  title: string;
  imageUrl: string | null;
  // A Ticketmaster não fornece sinopse — vem null; o TMDb já traz a
  // sinopse do filme pronta (overview), então esse campo pré-preenche a
  // descrição no passo 2 do formulário quando disponível.
  description: string | null;
  startsAt: string | null;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  category: string | null;
  raw: Record<string, unknown>;
}

export interface CatalogSearchResponse {
  items: CatalogEvent[];
  page: number;
  totalPages: number;
}
