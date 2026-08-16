import {
  mapTmdbMovie,
  parseTmdbMovieId,
  TmdbMovieRaw,
  toTmdbExternalId,
} from './tmdb-mapper.util';

describe('toTmdbExternalId / parseTmdbMovieId', () => {
  it('prefixa e des-prefixa o id de forma simétrica', () => {
    expect(toTmdbExternalId(27205)).toBe('tmdb:27205');
    expect(parseTmdbMovieId('tmdb:27205')).toBe('27205');
  });

  it('retorna null ao tentar parsear um externalId que não é do TMDb', () => {
    expect(parseTmdbMovieId('tm-123')).toBeNull();
  });
});

describe('mapTmdbMovie', () => {
  it('mapeia um filme completo do TMDb para o formato interno', () => {
    const raw: TmdbMovieRaw = {
      id: 27205,
      title: 'A Origem',
      overview: 'Um ladrão que rouba segredos corporativos através de sonhos.',
      backdrop_path: '/backdrop.jpg',
      poster_path: '/poster.jpg',
      genre_ids: [28, 878],
    };

    expect(mapTmdbMovie(raw)).toEqual({
      externalId: 'tmdb:27205',
      source: 'TMDB',
      title: 'A Origem',
      imageUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
      description:
        'Um ladrão que rouba segredos corporativos através de sonhos.',
      startsAt: null,
      venueName: '',
      venueCity: '',
      venueAddress: '',
      category: 'Ação',
      raw,
    });
  });

  it('cai pro poster quando não há backdrop', () => {
    const raw: TmdbMovieRaw = {
      id: 1,
      title: 'Filme sem backdrop',
      poster_path: '/poster.jpg',
    };

    expect(mapTmdbMovie(raw).imageUrl).toBe(
      'https://image.tmdb.org/t/p/w780/poster.jpg',
    );
  });

  it('retorna imageUrl/description/category nulos quando ausentes na resposta', () => {
    const raw: TmdbMovieRaw = { id: 2, title: 'Filme sem metadados' };

    const result = mapTmdbMovie(raw);

    expect(result.imageUrl).toBeNull();
    expect(result.description).toBeNull();
    expect(result.category).toBeNull();
    expect(result.startsAt).toBeNull();
    expect(result.venueName).toBe('');
    expect(result.venueCity).toBe('');
    expect(result.venueAddress).toBe('');
  });

  it('trata overview em branco (só espaços) como sem descrição', () => {
    const raw: TmdbMovieRaw = {
      id: 3,
      title: 'Filme com overview vazio',
      overview: '   ',
    };

    expect(mapTmdbMovie(raw).description).toBeNull();
  });

  it('usa o primeiro gênero da lista quando há mais de um', () => {
    const raw: TmdbMovieRaw = {
      id: 4,
      title: 'Filme multi-gênero',
      genre_ids: [35, 18],
    };

    expect(mapTmdbMovie(raw).category).toBe('Comédia');
  });

  it('retorna categoria nula pra um genre_id desconhecido', () => {
    const raw: TmdbMovieRaw = {
      id: 5,
      title: 'Filme com gênero inválido',
      genre_ids: [999999],
    };

    expect(mapTmdbMovie(raw).category).toBeNull();
  });
});
