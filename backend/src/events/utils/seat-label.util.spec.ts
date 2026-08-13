import { generateSeatsForSection, rowLabel } from './seat-label.util';

describe('rowLabel', () => {
  it.each([
    [0, 'A'],
    [1, 'B'],
    [25, 'Z'],
    [26, 'AA'],
    [27, 'AB'],
    [51, 'AZ'],
    [52, 'BA'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])(
    'converte o índice %i para o rótulo %s (estilo planilha)',
    (index, expected) => {
      expect(rowLabel(index)).toBe(expected);
    },
  );
});

describe('generateSeatsForSection', () => {
  it('gera assentos com fileira, número e label corretos para um setor pequeno', () => {
    const seats = generateSeatsForSection(2, 3);

    expect(seats).toEqual([
      { row: 'A', number: 1, label: 'A1' },
      { row: 'A', number: 2, label: 'A2' },
      { row: 'A', number: 3, label: 'A3' },
      { row: 'B', number: 1, label: 'B1' },
      { row: 'B', number: 2, label: 'B2' },
      { row: 'B', number: 3, label: 'B3' },
    ]);
  });

  it('gera a quantidade total correta de assentos e usa fileira dupla (AA) após a 26ª fileira', () => {
    // 27 fileiras x 10 assentos: fileiras 0-25 são A..Z, a 27ª (índice 26) é 'AA'.
    const seats = generateSeatsForSection(27, 10);

    expect(seats).toHaveLength(270);
    expect(seats[0]).toEqual({ row: 'A', number: 1, label: 'A1' });
    expect(seats[259]).toEqual({ row: 'Z', number: 10, label: 'Z10' });
    expect(seats[260]).toEqual({ row: 'AA', number: 1, label: 'AA1' });
    expect(seats[269]).toEqual({ row: 'AA', number: 10, label: 'AA10' });
  });

  it('retorna array vazio quando rowsCount é 0', () => {
    expect(generateSeatsForSection(0, 10)).toEqual([]);
  });
});
