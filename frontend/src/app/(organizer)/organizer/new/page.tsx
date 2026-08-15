"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { useCatalogSearchQuery } from "@/hooks/use-catalog";
import { useCreateEventMutation } from "@/hooks/use-organizer-events";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/page-loader";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SectionsFieldArray } from "@/components/organizer/sections-field-array";
import { sectionSchema, sectionsToPriceCents } from "@/lib/event-section-schema";
import { EVENTS_MAX_CAPACITY } from "@/lib/event-constants";
import { formatEventDate } from "@/lib/format";
import type { CatalogEvent } from "@/types/catalog";

const configureSchema = z.object({
  description: z.string().min(10, "Descreva o evento em pelo menos 10 caracteres"),
  venueAddress: z.string().min(1, "Obrigatório"),
  category: z.string().max(60).optional(),
  sections: z.array(sectionSchema).min(1).max(20),
});

type ConfigureFormValues = z.infer<typeof configureSchema>;

// A mensagem antiga era fixa e sempre culpava a TICKETMASTER_API_KEY,
// mesmo quando a causa real era outra (rate-limit do nosso próprio
// endpoint, timeout de rede, etc.) — agora reflete o motivo de verdade.
function describeCatalogError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 429) {
      return "Muitas buscas em sequência — aguarde alguns segundos e tente de novo.";
    }
    const backendMessage = (error.response?.data as { message?: string } | undefined)
      ?.message;
    if (backendMessage) {
      return backendMessage;
    }
  }
  return "Não foi possível buscar no catálogo agora. Tente novamente em instantes.";
}

export default function NewEventPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<CatalogEvent | null>(null);
  // Sem isso, cada tecla digitada disparava uma busca — "Flamengo" vira 8
  // requisições em ~1s, estourando o rate-limit do endpoint em segundos.
  const debouncedKeyword = useDebouncedValue(keyword, 450);
  const {
    data: searchResult,
    isLoading,
    isError,
    error: searchError,
  } = useCatalogSearchQuery(debouncedKeyword);
  const createEventMutation = useCreateEventMutation();

  const form = useForm<ConfigureFormValues>({
    resolver: zodResolver(configureSchema),
    defaultValues: {
      description: "",
      venueAddress: "",
      category: "",
      sections: [{ name: "Pista", priceReais: 50, rowsCount: 5, seatsPerRow: 10 }],
    },
  });

  // A Ticketmaster já manda o endereço completo do local pra boa parte dos
  // eventos (ex. "620 Atlantic Ave" pro Barclays Center) — pré-preenchemos
  // com o que veio, mas deixamos editável, porque nem todo venue tem esse
  // dado e o organizador pode querer ajustar.
  function handleSelectEvent(item: CatalogEvent) {
    setSelected(item);
    form.setValue("venueAddress", item.venueAddress);
    form.setValue("category", item.category ?? "");
  }

  async function onSubmit(values: ConfigureFormValues) {
    if (!selected) return;
    try {
      const totalSeats = values.sections.reduce((sum, s) => sum + s.rowsCount * s.seatsPerRow, 0);
      if (totalSeats > EVENTS_MAX_CAPACITY) {
        toast.error(`Capacidade total (${totalSeats}) excede o máximo de ${EVENTS_MAX_CAPACITY} assentos.`);
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
        category: values.category || undefined,
        sections: sectionsToPriceCents(values.sections),
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

        {isLoading && <PageLoader label="Buscando no catálogo..." />}

        {isError && <p className="text-muted-foreground">{describeCatalogError(searchError)}</p>}

        {!isLoading &&
          !isError &&
          debouncedKeyword.length > 1 &&
          searchResult?.items.length === 0 && (
            <p className="text-muted-foreground">
              Nenhum resultado para &quot;{debouncedKeyword}&quot;.
            </p>
          )}

        <div className="space-y-3">
          {searchResult?.items.map((item) => (
            <Card
              key={item.externalId}
              className="cursor-pointer transition-colors hover:border-foreground/30"
              onClick={() => handleSelectEvent(item)}
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
                    {item.category ? ` • ${item.category}` : ""}
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
                <p className="text-xs text-muted-foreground">
                  {selected.venueAddress
                    ? "Preenchido automaticamente com o endereço que a Ticketmaster informou — confira e ajuste se precisar."
                    : "A Ticketmaster não informou o endereço deste local — preencha manualmente."}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <FormControl>
                  <Input placeholder="Music, Sports, Arts & Theatre..." {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {selected.category
                    ? "Preenchida automaticamente a partir da classificação da Ticketmaster — confira e ajuste se precisar."
                    : "A Ticketmaster não classificou este evento — preencha manualmente ou deixe em branco."}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <SectionsFieldArray control={form.control} maxCapacity={EVENTS_MAX_CAPACITY} />

          <Button type="submit" size="lg" disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? "Criando..." : "Criar evento (rascunho)"}
          </Button>
        </form>
      </Form>
    </main>
  );
}
