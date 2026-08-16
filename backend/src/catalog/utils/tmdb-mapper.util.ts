import type { CatalogEvent } from './catalog-event.model';

export interface TmdbMovieRaw {
  id: number;
  title: string;
  overview?: string;
  release_date?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genre_ids?: number[];
}

export interface TmdbSearchResponse {
  results?: TmdbMovieRaw[];
  page?: number;
  total_pages?: number;
}

// Prefixo aplicado ao externalId de todo item do TMDb — a coluna
// `externalId` do evento é única globalmente na tabela (não escopada por
// fonte), e IDs numéricos do TMDb (ex. "27205") poderiam, em teoria,
// colidir com um ID alfanumérico da Ticketmaster. O prefixo também é o
// que o backend usa pra rotear getById() pra API certa (ver
// catalog.service.ts).
export const TMDB_EXTERNAL_ID_PREFIX = 'tmdb:';

export function toTmdbExternalId(movieId: number | string): string {
  return `${TMDB_EXTERNAL_ID_PREFIX}${movieId}`;
}

export function parseTmdbMovieId(externalId: string): string | null {
  return externalId.startsWith(TMDB_EXTERNAL_ID_PREFIX)
    ? externalId.slice(TMDB_EXTERNAL_ID_PREFIX.length)
    : null;
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';

// Lista fixa dos gêneros oficiais de filme do TMDb (o mesmo conjunto do
// endpoint /genre/movie/list) — hardcoded de propósito: é um catálogo
// pequeno e estável, então resolver o nome do gênero aqui evita uma
// chamada extra à API a cada busca só pra isso.
const TMDB_GENRE_NAMES: Record<number, string> = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Música',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção científica',
  10770: 'Cinema TV',
  53: 'Suspense',
  10752: 'Guerra',
  37: 'Faroeste',
};

function pickCategory(genreIds: number[] | undefined): string | null {
  if (!genreIds || genreIds.length === 0) {
    return null;
  }
  return TMDB_GENRE_NAMES[genreIds[0]] ?? null;
}

// Preferimos o backdrop (paisagem, mesma proporção 16:9 que os cards do
// resto do site já usam) — o poster (retrato) só entra como fallback
// quando o filme não tiver backdrop.
function pickImage(movie: TmdbMovieRaw): string | null {
  const path = movie.backdrop_path ?? movie.poster_path;
  return path ? `${TMDB_IMAGE_BASE_URL}${path}` : null;
}

export function mapTmdbMovie(movie: TmdbMovieRaw): CatalogEvent {
  return {
    externalId: toTmdbExternalId(movie.id),
    source: 'TMDB',
    title: movie.title,
    imageUrl: pickImage(movie),
    // Diferente da Ticketmaster, o TMDb já entrega uma sinopse pronta —
    // o organizador não precisa digitar a descrição do zero.
    description: movie.overview?.trim() || null,
    // TMDb é um catálogo de filmes, não de sessões — não existe
    // "data/hora" nem "local" na API. Isso fica sempre em branco aqui,
    // pro organizador preencher manualmente (qual cinema, que sessão) no
    // passo 2 do formulário.
    startsAt: null,
    venueName: '',
    venueCity: '',
    venueAddress: '',
    category: pickCategory(movie.genre_ids),
    raw: movie as unknown as Record<string, unknown>,
  };
}
