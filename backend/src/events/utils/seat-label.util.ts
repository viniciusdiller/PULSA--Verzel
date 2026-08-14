// Rótulo de fileira estilo planilha (A, B, ..., Z, AA, AB, ...) — evita
// estourar o alfabeto quando um setor tem mais de 26 fileiras.
export function rowLabel(index: number): string {
  let n = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export interface GeneratedSeat {
  row: string;
  number: number;
  label: string;
}

export function generateSeatsForSection(
  rowsCount: number,
  seatsPerRow: number,
): GeneratedSeat[] {
  const seats: GeneratedSeat[] = [];

  for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
    const row = rowLabel(rowIndex);
    for (let number = 1; number <= seatsPerRow; number++) {
      seats.push({ row, number, label: `${row}${number}` });
    }
  }

  return seats;
}
