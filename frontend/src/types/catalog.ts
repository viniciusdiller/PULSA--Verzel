export interface CatalogEvent {
  externalId: string;
  title: string;
  imageUrl: string | null;
  startsAt: string | null;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  raw: Record<string, unknown>;
}

export interface CatalogSearchResponse {
  items: CatalogEvent[];
  page: number;
  totalPages: number;
}
