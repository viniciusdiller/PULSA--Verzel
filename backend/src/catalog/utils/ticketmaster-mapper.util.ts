export interface TicketmasterImage {
  url: string;
  width?: number;
  height?: number;
  ratio?: string;
}

export interface TicketmasterVenue {
  name?: string;
  city?: { name?: string };
  address?: { line1?: string };
}

export interface TicketmasterClassification {
  primary?: boolean;
  segment?: { name?: string };
}

export interface TicketmasterEventRaw {
  id: string;
  name: string;
  images?: TicketmasterImage[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  classifications?: TicketmasterClassification[];
  _embedded?: { venues?: TicketmasterVenue[] };
}

export interface CatalogEvent {
  externalId: string;
  title: string;
  imageUrl: string | null;
  startsAt: string | null;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  category: string | null;
  raw: TicketmasterEventRaw;
}

// Preferimos a imagem widescreen (16:9) de maior largura disponível — é a
// que melhor se comporta como capa de card/hero no front. Se não houver
// nenhuma com esse ratio, cai para a maior imagem disponível.
export function pickBestImage(
  images: TicketmasterImage[] | undefined,
): string | null {
  if (!images || images.length === 0) {
    return null;
  }

  const widescreen = images
    .filter((image) => image.ratio === '16_9')
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));

  if (widescreen.length > 0) {
    return widescreen[0].url;
  }

  const byWidth = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  return byWidth[0].url;
}

// O "segment" é o nível mais alto da classificação da Ticketmaster (ex.
// "Music", "Sports", "Arts & Theatre", "Film") — o mapeamento natural pra
// uma categoria de evento simples. Preferimos a classificação marcada como
// `primary`, mas caímos pra primeira disponível se nenhuma estiver marcada.
// A Ticketmaster usa o nome literal "Undefined" quando não sabe classificar
// o evento — tratamos isso como "sem categoria", igual a não vir nada.
function pickCategory(
  classifications: TicketmasterClassification[] | undefined,
): string | null {
  if (!classifications || classifications.length === 0) {
    return null;
  }

  const primary = classifications.find((c) => c.primary) ?? classifications[0];
  const name = primary.segment?.name;
  return name && name !== 'Undefined' ? name : null;
}

export function mapTicketmasterEvent(raw: TicketmasterEventRaw): CatalogEvent {
  const venue = raw._embedded?.venues?.[0];

  return {
    externalId: raw.id,
    title: raw.name,
    imageUrl: pickBestImage(raw.images),
    startsAt: raw.dates?.start?.dateTime ?? raw.dates?.start?.localDate ?? null,
    venueName: venue?.name ?? '',
    venueCity: venue?.city?.name ?? '',
    venueAddress: venue?.address?.line1 ?? '',
    category: pickCategory(raw.classifications),
    raw,
  };
}
