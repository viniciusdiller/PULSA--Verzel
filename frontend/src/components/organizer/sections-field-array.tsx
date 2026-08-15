"use client";

import { useFieldArray, useWatch, type Control, type FieldValues, type Path } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { SectionFormValues } from "@/lib/event-section-schema";

interface SectionsFieldArrayProps<T extends FieldValues & { sections: SectionFormValues[] }> {
  control: Control<T>;
  maxCapacity: number;
}

// Editor de setores reutilizado em "novo evento" (passo 2) e "editar
// evento" — mesmo grid, mesmo cabeçalho de colunas, mesmo contador de
// capacidade ao vivo, pra não ter duas versões divergindo com o tempo.
export function SectionsFieldArray<T extends FieldValues & { sections: SectionFormValues[] }>({
  control,
  maxCapacity,
}: SectionsFieldArrayProps<T>) {
  const name = "sections" as Path<T>;
  const { fields, append, remove } = useFieldArray({ control, name: name as never });

  const watchedSections = useWatch({ control, name }) as SectionFormValues[] | undefined;
  const liveTotalSeats = (watchedSections ?? []).reduce(
    (sum, s) => sum + (Number(s?.rowsCount) || 0) * (Number(s?.seatsPerRow) || 0),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl">Setores</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ name: "", priceReais: 50, rowsCount: 5, seatsPerRow: 10 } as never)
          }
        >
          + Setor
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Cada setor vira um bloco do mapa de assentos: <strong>fileiras</strong> é quantas
        fileiras o setor tem, <strong>assentos por fileira</strong> é quantos lugares em cada
        uma — o setor abaixo, por exemplo, tem 5 fileiras de 10 assentos, 50 lugares no total.
      </p>

      <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-1 text-xs text-muted-foreground sm:grid">
        <span>Nome do setor</span>
        <span>Preço (R$)</span>
        <span>Fileiras</span>
        <span>Assentos por fileira</span>
        <span />
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <FormField
            control={control}
            name={`sections.${index}.name` as Path<T>}
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <FormLabel className="sm:sr-only">Nome do setor</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: Pista, Setor VIP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`sections.${index}.priceReais` as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sm:sr-only">Preço em reais</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input type="number" min={0} step="0.01" className="pl-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`sections.${index}.rowsCount` as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sm:sr-only">Fileiras</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={50} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`sections.${index}.seatsPerRow` as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sm:sr-only">Assentos por fileira</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={50} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-auto"
            disabled={fields.length === 1}
            onClick={() => remove(index)}
          >
            Remover setor
          </Button>
        </div>
      ))}

      <p className="text-sm text-muted-foreground">
        Capacidade total:{" "}
        <strong className={liveTotalSeats > maxCapacity ? "text-destructive" : "text-foreground"}>
          {liveTotalSeats} assento{liveTotalSeats === 1 ? "" : "s"}
        </strong>{" "}
        (máximo {maxCapacity})
      </p>
    </div>
  );
}
