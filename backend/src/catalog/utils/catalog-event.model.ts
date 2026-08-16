// Formato normalizado e agnóstico de fonte que o catálogo devolve pro
// resto do app — tanto o mapper da Ticketmaster quanto o do TMDb convergem
// pra este mesmo formato, então o wizard de criação de evento não precisa
// saber os detalhes de nenhuma API externa específica.
export type CatalogSource = 'TICKETMASTER' | 'TMDB';

export interface CatalogEvent {
  externalId: string;
  source: CatalogSource;
  title: string;
  imageUrl: string | null;
  // A Ticketmaster não fornece sinopse nos campos que mapeamos (fica
  // null); o TMDb fornece (overview) — o organizador não precisa digitar
  // a descrição na mão quando o evento vem de lá.
  description: string | null;
  startsAt: string | null;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  category: string | null;
  raw: Record<string, unknown>;
}
