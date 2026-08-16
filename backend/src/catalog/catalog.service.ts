import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CatalogSearchQueryDto } from './dto/catalog-search-query.dto';
import { CatalogEvent, CatalogSource } from './utils/catalog-event.model';
import {
  mapTicketmasterEvent,
  TicketmasterEventRaw,
} from './utils/ticketmaster-mapper.util';
import {
  mapTmdbMovie,
  parseTmdbMovieId,
  TmdbMovieRaw,
  TmdbSearchResponse,
} from './utils/tmdb-mapper.util';

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;

interface TicketmasterSearchResponse {
  _embedded?: { events?: TicketmasterEventRaw[] };
  page?: { number?: number; totalPages?: number };
}

export interface CatalogSearchResult {
  items: CatalogEvent[];
  page: number;
  totalPages: number;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async search(query: CatalogSearchQueryDto): Promise<CatalogSearchResult> {
    const source: CatalogSource = query.source ?? 'TICKETMASTER';
    return source === 'TMDB'
      ? this.searchTmdb(query)
      : this.searchTicketmaster(query);
  }

  async getById(externalId: string): Promise<CatalogEvent> {
    const tmdbMovieId = parseTmdbMovieId(externalId);
    return tmdbMovieId
      ? this.getTmdbMovieById(tmdbMovieId)
      : this.getTicketmasterEventById(externalId);
  }

  private async searchTicketmaster(
    query: CatalogSearchQueryDto,
  ): Promise<CatalogSearchResult> {
    const apiKey = this.getApiKeyOrThrow('TICKETMASTER_API_KEY');
    const page = query.page ?? 0;
    const cacheKey = `catalog:search:TICKETMASTER:${query.keyword ?? ''}:${query.city ?? ''}:${page}`;

    const cached = await this.cache.get<CatalogSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(`${TICKETMASTER_BASE_URL}/events.json`);
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('page', String(page));
    if (query.keyword) {
      url.searchParams.set('keyword', query.keyword);
    }
    if (query.city) {
      url.searchParams.set('city', query.city);
    }

    const data = await this.fetchJson<TicketmasterSearchResponse>(url);

    const result: CatalogSearchResult = {
      items: (data._embedded?.events ?? []).map(mapTicketmasterEvent),
      page: data.page?.number ?? 0,
      totalPages: data.page?.totalPages ?? 0,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  private async searchTmdb(
    query: CatalogSearchQueryDto,
  ): Promise<CatalogSearchResult> {
    const apiKey = this.getApiKeyOrThrow('TMDB_API_KEY');
    const page = query.page ?? 0;
    const cacheKey = `catalog:search:TMDB:${query.keyword ?? ''}:${page}`;

    const cached = await this.cache.get<CatalogSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // TMDb pagina a partir de 1 — convertemos aqui pra manter o DTO
    // (0-based, igual ao da Ticketmaster) consistente pro resto do app.
    const url = new URL(`${TMDB_BASE_URL}/search/movie`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('page', String(page + 1));
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('query', query.keyword ?? '');

    const data = await this.fetchJson<TmdbSearchResponse>(url);

    const result: CatalogSearchResult = {
      items: (data.results ?? []).map(mapTmdbMovie),
      page: (data.page ?? 1) - 1,
      totalPages: data.total_pages ?? 0,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  private async getTicketmasterEventById(
    externalId: string,
  ): Promise<CatalogEvent> {
    const apiKey = this.getApiKeyOrThrow('TICKETMASTER_API_KEY');
    const cacheKey = `catalog:event:TICKETMASTER:${externalId}`;

    const cached = await this.cache.get<CatalogEvent>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(
      `${TICKETMASTER_BASE_URL}/events/${encodeURIComponent(externalId)}.json`,
    );
    url.searchParams.set('apikey', apiKey);

    const data = await this.fetchJson<TicketmasterEventRaw>(url);
    const mapped = mapTicketmasterEvent(data);

    await this.cache.set(cacheKey, mapped, CACHE_TTL_MS);
    return mapped;
  }

  private async getTmdbMovieById(movieId: string): Promise<CatalogEvent> {
    const apiKey = this.getApiKeyOrThrow('TMDB_API_KEY');
    const cacheKey = `catalog:event:TMDB:${movieId}`;

    const cached = await this.cache.get<CatalogEvent>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(
      `${TMDB_BASE_URL}/movie/${encodeURIComponent(movieId)}`,
    );
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'pt-BR');

    const data = await this.fetchJson<
      TmdbMovieRaw & { genres?: { id: number }[] }
    >(url);
    // O detalhe de um filme vem com `genres` (objetos {id,name}), não
    // `genre_ids` (só números, que é o formato da busca) — normalizamos
    // aqui pra reaproveitar o mesmo mapTmdbMovie da busca.
    const normalized: TmdbMovieRaw = {
      ...data,
      genre_ids: data.genres?.map((g) => g.id) ?? data.genre_ids,
    };
    const mapped = mapTmdbMovie(normalized);

    await this.cache.set(cacheKey, mapped, CACHE_TTL_MS);
    return mapped;
  }

  private getApiKeyOrThrow(
    envVar: 'TICKETMASTER_API_KEY' | 'TMDB_API_KEY',
  ): string {
    const apiKey = this.configService.get<string>(envVar);
    if (!apiKey) {
      throw new ServiceUnavailableException(
        `Catálogo indisponível: ${envVar} não configurada.`,
      );
    }
    return apiKey;
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (response.status === 404) {
        throw new NotFoundException('Evento não encontrado no catálogo.');
      }
      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Catálogo indisponível no momento. Tente novamente em instantes.',
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      // Falha de rede, timeout (abort) ou JSON inválido — dependência
      // externa fora do nosso controle, respondemos de forma previsível.
      throw new ServiceUnavailableException(
        'Catálogo indisponível no momento. Tente novamente em instantes.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
