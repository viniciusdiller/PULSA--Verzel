"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { useCatalogSearchQuery } from "@/hooks/use-catalog";
import { useCreateEventMutation } from "@/hooks/use-organizer-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatEventDate } from "@/lib/format";
import type { CatalogEvent } from "@/types/catalog";

const sectionSchema = z.object({
  name: z.string().min(1, "Obrigatório"),
  // O organizador digita em reais (o jeito que ele pensa em preço) — a
  // conversão pra centavos (o que a API espera) acontece só no submit.
  priceReais: z.coerce.number().min(0, "Não pode ser negativo"),
  rowsCount: z.coerce.number().int().min(1).max(50),
  seatsPerRow: z.coerce.number().int().min(1).max(50),
});

const configureSchema = z.object({
  description: z.string().min(10, "Descreva o evento em pelo menos 10 caracteres"),
  venueAddress: z.string().min(1, "Obrigatório"),
  sections: z.array(sectionSchema).min(1).max(20),
});

type ConfigureFormValues = z.infer<typeof configureSchema>;

export default function NewEventPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<CatalogEvent | null>(null);
  const { data: searchResult, isLoading, isError } = useCatalogSearchQuery(keyword);
  const createEventMutation = useCreateEventMutation();

  const form = useForm<ConfigureFormValues>({
    resolver: zodResolver(configureSchema),
    defaultValues: {
      description: "",
      venueAddress: "",
      sections: [{ name: "Pista", priceReais: 50, rowsCount: 5, seatsPerRow: 10 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "sections" });

  // Total de assentos ao vivo, pra o organizador ver o impacto de cada
  // fileira/assento antes de tentar submeter — o limite de 300 só é
  // checado no submit, mas exibir o total sempre evita a surpresa do erro.
  const watchedSections = useWatch({ control: form.control, name: "sections" });
  const liveTotalSeats = (watchedSections ?? []).reduce(
    (sum, s) => sum + (Number(s?.rowsCount) || 0) * (Number(s?.seatsPerRow) || 0),
    0,
  );

  async function onSubmit(values: ConfigureFormValues) {
    if (!selected) return;
    try {
      const totalSeats = values.sections.reduce((sum, s) => sum + s.rowsCount * s.seatsPerRow, 0);
      if (totalSeats > 300) {
        toast.error(`Capacidade total (${totalSeats}) excede o máximo de 300 assentos.`);
        return;
      }

      const created = await createEventMutation.mutateAsync({
        title: selected.title,
        description: values.description,
        imageUrl: selected.imageUrl ?? undefined,
        // Date.now() aqui só roda dentro de onSubmit (disparado por
        // handleSubmit no clique), nunca durante o render — falso positivo
        // da checagem estática do plugin, que não distingue "código no
        // escopo do componente" de "só alcançável a partir de um handler".
        // eslint-disable-next-line react-hooks/purity
        startsAt: selected.startsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        venueName: selected.venueName || "A definir",
        venueCity: selected.venueCity || "A definir",
        venueAddress: values.venueAddress,
        externalId: selected.externalId,
        sections: values.sections.map(({ name, priceReais, rowsCount, seatsPerRow }) => ({
          name,
          priceCents: Math.round(priceReais * 100),
          rowsCount,
          seatsPerRow,
        })),
      });
      toast.success("Evento criado como rascunho.");
      router.push(`/organizer/${created.id}`);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível criar o evento.");
    }
  }

  if (!selected) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Novo evento — passo 1 de 2
        </p>
        <h1 className="font-heading mb-6 text-3xl">Buscar no catálogo</h1>

        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nome do show ou artista..."
          className="mb-6"
        />

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-muted-foreground">
            Catálogo indisponível no momento (verifique se a TICKETMASTER_API_KEY está
            configurada no backend). Tente novamente em instantes.
          </p>
        )}

        {!isLoading && !isError && keyword.length > 1 && searchResult?.items.length === 0 && (
          <p className="text-muted-foreground">Nenhum resultado para &quot;{keyword}&quot;.</p>
        )}

        <div className="space-y-3">
          {searchResult?.items.map((item) => (
            <Card
              key={item.externalId}
              className="cursor-pointer transition-colors hover:border-foreground/30"
              onClick={() => setSelected(item)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                {item.imageUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded">
                    <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                  </div>
                )}
                <div>
                  <h3 className="font-heading text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.venueCity || "Local a confirmar"}
                    {item.startsAt ? ` • ${formatEventDate(item.startsAt)}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
        Novo evento — passo 2 de 2
      </p>
      <h1 className="font-heading mb-6 text-3xl">{selected.title}</h1>
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => setSelected(null)}>
        ← Escolher outro evento do catálogo
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="venueAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço do local</FormLabel>
                <FormControl>
                  <Input placeholder="Av. Principal, 1000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl">Setores</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ name: "", priceReais: 50, rowsCount: 5, seatsPerRow: 10 })
                }
              >
                + Setor
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Cada setor vira um bloco do mapa de assentos: <strong>fileiras</strong> é quantas
              fileiras o setor tem, <strong>assentos por fileira</strong> é quantos lugares em
              cada uma — o setor abaixo, por exemplo, tem 5 fileiras de 10 assentos, 50 lugares
              no total.
            </p>

            {/* Cabeçalho das colunas, uma vez só — repetir um <FormLabel> em
                cada linha do array poluiria visualmente uma lista que pode
                ter várias fileiras de setores. */}
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-1 text-xs text-muted-foreground sm:grid">
              <span>Nome do setor</span>
              <span>Preço (R$)</span>
              <span>Fileiras</span>
              <span>Assentos por fileira</span>
              <span />
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
              >
                <FormField
                  control={form.control}
                  name={`sections.${index}.name`}
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
                  control={form.control}
                  name={`sections.${index}.priceReais`}
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
                  control={form.control}
                  name={`sections.${index}.rowsCount`}
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
                  control={form.control}
                  name={`sections.${index}.seatsPerRow`}
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
              <strong className={liveTotalSeats > 300 ? "text-destructive" : "text-foreground"}>
                {liveTotalSeats} assento{liveTotalSeats === 1 ? "" : "s"}
              </strong>{" "}
              (máximo 300)
            </p>
          </div>

          <Button type="submit" size="lg" disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? "Criando..." : "Criar evento (rascunho)"}
          </Button>
        </form>
      </Form>
    </main>
  );
}
