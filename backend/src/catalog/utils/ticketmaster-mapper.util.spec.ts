import {
  mapTicketmasterEvent,
  pickBestImage,
  TicketmasterEventRaw,
} from './ticketmaster-mapper.util';

describe('pickBestImage', () => {
  it('retorna null quando não há imagens', () => {
    expect(pickBestImage(undefined)).toBeNull();
    expect(pickBestImage([])).toBeNull();
  });

  it('prefere a imagem 16:9 de maior largura', () => {
    const url = pickBestImage([
      { url: 'small-16x9', width: 200, ratio: '16_9' },
      { url: 'big-16x9', width: 1024, ratio: '16_9' },
      { url: 'big-4x3', width: 2000, ratio: '4_3' },
    ]);

    expect(url).toBe('big-16x9');
  });

  it('cai para a maior imagem disponível quando não há 16:9', () => {
    const url = pickBestImage([
      { url: 'small', width: 100, ratio: '3_2' },
      { url: 'big', width: 800, ratio: '4_3' },
    ]);

    expect(url).toBe('big');
  });
});

describe('mapTicketmasterEvent', () => {
  it('mapeia um evento completo do Ticketmaster para o formato interno', () => {
    const raw: TicketmasterEventRaw = {
      id: 'tm-123',
      name: 'Show Incrível',
      images: [{ url: 'https://img/1', width: 1024, ratio: '16_9' }],
      dates: { start: { dateTime: '2026-12-20T22:00:00Z' } },
      _embedded: {
        venues: [
          {
            name: 'Arena X',
            city: { name: 'São Paulo' },
            address: { line1: 'Rua A, 1' },
          },
        ],
      },
    };

    expect(mapTicketmasterEvent(raw)).toEqual({
      externalId: 'tm-123',
      title: 'Show Incrível',
      imageUrl: 'https://img/1',
      startsAt: '2026-12-20T22:00:00Z',
      venueName: 'Arena X',
      venueCity: 'São Paulo',
      venueAddress: 'Rua A, 1',
      raw,
    });
  });

  it('usa localDate quando dateTime não está presente', () => {
    const raw: TicketmasterEventRaw = {
      id: 'tm-1',
      name: 'Evento sem hora definida',
      dates: { start: { localDate: '2026-12-20' } },
    };

    expect(mapTicketmasterEvent(raw).startsAt).toBe('2026-12-20');
  });

  it('preenche campos de venue/imagem com valores vazios/nulos quando ausentes na resposta', () => {
    const raw: TicketmasterEventRaw = { id: 'tm-2', name: 'Evento sem venue' };

    const result = mapTicketmasterEvent(raw);

    expect(result.imageUrl).toBeNull();
    expect(result.startsAt).toBeNull();
    expect(result.venueName).toBe('');
    expect(result.venueCity).toBe('');
    expect(result.venueAddress).toBe('');
  });
});
