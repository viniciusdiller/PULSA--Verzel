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
import {
  CatalogEvent,
  mapTicketmasterEvent,
  TicketmasterEventRaw,
} from './utils/ticketmaster-mapper.util';

const TICKETMASTER_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
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
    const apiKey = this.getApiKeyOrThrow();
    const page = query.page ?? 0;
    const cacheKey = `catalog:search:${query.keyword ?? ''}:${query.city ?? ''}:${page}`;

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

  async getById(externalId: string): Promise<CatalogEvent> {
    const apiKey = this.getApiKeyOrThrow();
    const cacheKey = `catalog:event:${externalId}`;

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

  private getApiKeyOrThrow(): string {
    const apiKey = this.configService.get<string>('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Catálogo indisponível: TICKETMASTER_API_KEY não configurada.',
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
