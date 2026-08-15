import { z } from "zod";

// Compartilhado entre "novo evento" (passo 2) e "editar evento" — mesma
// forma de setor nos dois fluxos, só muda o que acontece no submit.
export const sectionSchema = z.object({
  name: z.string().min(1, "Obrigatório"),
  // O organizador digita em reais (o jeito que ele pensa em preço) — a
  // conversão pra centavos (o que a API espera) acontece só no submit.
  priceReais: z.coerce.number().min(0, "Não pode ser negativo"),
  rowsCount: z.coerce.number().int().min(1).max(50),
  seatsPerRow: z.coerce.number().int().min(1).max(50),
});

export type SectionFormValues = z.infer<typeof sectionSchema>;

export function sectionsToPriceCents(sections: SectionFormValues[]) {
  return sections.map(({ name, priceReais, rowsCount, seatsPerRow }) => ({
    name,
    priceCents: Math.round(priceReais * 100),
    rowsCount,
    seatsPerRow,
  }));
}
