import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { CatalogService } from './catalog.service';
import { TicketmasterEventRaw } from './utils/ticketmaster-mapper.util';

function fakeResponse(
  overrides: Partial<Response> & { jsonBody?: unknown },
): Response {
  const { jsonBody, ...rest } = overrides;
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(jsonBody),
    ...rest,
  } as Response;
}

const rawEvent: TicketmasterEventRaw = {
  id: 'tm-1',
  name: 'Show Teste',
  images: [{ url: 'https://img/1', width: 1024, ratio: '16_9' }],
  dates: { start: { dateTime: '2026-12-20T22:00:00Z' } },
  _embedded: {
    venues: [
      { name: 'Arena', city: { name: 'SP' }, address: { line1: 'Rua A' } },
    ],
  },
};

describe('CatalogService', () => {
  let service: CatalogService;
  let configService: { get: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };
  let fetchMock: jest.Mock<Promise<Response>, [URL, RequestInit?]>;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue('fake-api-key') };
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    fetchMock = jest.fn<Promise<Response>, [URL, RequestInit?]>();
    global.fetch = fetchMock;

    service = new CatalogService(
      configService as unknown as ConfigService,
      cache as unknown as Cache,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('search', () => {
    it('rejeita com ServiceUnavailable quando a API key não está configurada (sem tocar cache/fetch)', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.search({})).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(cache.get).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('retorna do cache sem chamar a API externa quando já há resultado cacheado', async () => {
      const cached = { items: [], page: 0, totalPages: 0 };
      cache.get.mockResolvedValue(cached);

      const result = await service.search({ keyword: 'show' });

      expect(result).toBe(cached);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('busca na API, mapeia os eventos e grava no cache', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          jsonBody: {
            _embedded: { events: [rawEvent] },
            page: { number: 0, totalPages: 3 },
          },
        }),
      );

      const result = await service.search({
        keyword: 'show',
        city: 'SP',
        page: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].externalId).toBe('tm-1');
      expect(result.totalPages).toBe(3);
      expect(cache.set).toHaveBeenCalledWith(
        expect.any(String),
        result,
        5 * 60 * 1000,
      );

      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl.searchParams.get('keyword')).toBe('show');
      expect(calledUrl.searchParams.get('city')).toBe('SP');
      expect(calledUrl.searchParams.get('apikey')).toBe('fake-api-key');
    });

    it('retorna lista vazia quando a API não encontra nenhum evento (_embedded ausente)', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ jsonBody: { page: { number: 0, totalPages: 0 } } }),
      );

      const result = await service.search({});

      expect(result.items).toEqual([]);
    });

    it('rejeita com ServiceUnavailable quando a API externa responde com erro', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 500, jsonBody: {} }),
      );

      await expect(service.search({})).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('rejeita com ServiceUnavailable quando a chamada de rede falha (timeout/DNS/etc.)', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));

      await expect(service.search({})).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getById', () => {
    it('busca o evento por id, mapeia e grava no cache', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ jsonBody: rawEvent }));

      const result = await service.getById('tm-1');

      expect(result.externalId).toBe('tm-1');
      expect(cache.set).toHaveBeenCalledWith(
        'catalog:event:TICKETMASTER:tm-1',
        result,
        5 * 60 * 1000,
      );
    });

    it('retorna do cache sem chamar a API quando já cacheado', async () => {
      const cached = { externalId: 'tm-1' };
      cache.get.mockResolvedValue(cached);

      const result = await service.getById('tm-1');

      expect(result).toBe(cached);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejeita com NotFound quando o evento não existe no catálogo (404 da API)', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 404, jsonBody: {} }),
      );

      await expect(service.getById('nao-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejeita com ServiceUnavailable para outros erros da API externa', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 503, jsonBody: {} }),
      );

      await expect(service.getById('tm-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('rejeita com ServiceUnavailable quando a API key não está configurada', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.getById('tm-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('search (source: TMDB)', () => {
    it('busca na API do TMDb, mapeia os filmes e grava no cache com chave própria', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          jsonBody: {
            results: [{ id: 27205, title: 'A Origem', genre_ids: [28] }],
            page: 1,
            total_pages: 5,
          },
        }),
      );

      const result = await service.search({
        source: 'TMDB',
        keyword: 'origem',
        page: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].externalId).toBe('tmdb:27205');
      expect(result.items[0].source).toBe('TMDB');
      // Página 0-based no nosso DTO vira 1-based na URL do TMDb, e volta
      // pra 0-based na resposta normalizada.
      expect(result.page).toBe(0);
      expect(result.totalPages).toBe(5);

      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl.hostname).toBe('api.themoviedb.org');
      expect(calledUrl.searchParams.get('query')).toBe('origem');
      expect(calledUrl.searchParams.get('page')).toBe('1');
      expect(calledUrl.searchParams.get('api_key')).toBe('fake-api-key');
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining('catalog:search:TMDB:'),
        result,
        5 * 60 * 1000,
      );
    });

    it('retorna lista vazia quando o TMDb não encontra nenhum filme (results ausente)', async () => {
      fetchMock.mockResolvedValue(fakeResponse({ jsonBody: { page: 1 } }));

      const result = await service.search({ source: 'TMDB' });

      expect(result.items).toEqual([]);
    });

    it('rejeita com ServiceUnavailable quando TMDB_API_KEY não está configurada', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.search({ source: 'TMDB' })).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getById (externalId prefixado com tmdb:)', () => {
    it('roteia pra API do TMDb e normaliza genres → genre_ids antes de mapear', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          jsonBody: {
            id: 27205,
            title: 'A Origem',
            genres: [{ id: 28, name: 'Action' }],
          },
        }),
      );

      const result = await service.getById('tmdb:27205');

      expect(result.externalId).toBe('tmdb:27205');
      expect(result.source).toBe('TMDB');
      expect(result.category).toBe('Ação');

      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl.hostname).toBe('api.themoviedb.org');
      expect(calledUrl.pathname).toContain('/movie/27205');
      expect(cache.set).toHaveBeenCalledWith(
        'catalog:event:TMDB:27205',
        result,
        5 * 60 * 1000,
      );
    });
  });
});
