"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Film, Music } from "lucide-react";

import { useCatalogSearchQuery } from "@/hooks/use-catalog";
import { useCreateEventMutation } from "@/hooks/use-organizer-events";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/page-loader";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SectionsFieldArray } from "@/components/organizer/sections-field-array";
import { sectionSchema, sectionsToPriceCents } from "@/lib/event-section-schema";
import { EVENTS_MAX_CAPACITY } from "@/lib/event-constants";
import { formatEventDate } from "@/lib/format";
import type { CatalogEvent, CatalogSource } from "@/types/catalog";

const configureSchema = z.object({
  description: z.string().min(10, "Descreva o evento em pelo menos 10 caracteres"),
  venueName: z.string().min(1, "Obrigatório"),
  venueCity: z.string().min(1, "Obrigatório"),
  venueAddress: z.string().min(1, "Obrigatório"),
  startsAt: z.date({ required_error: "Obrigatório", invalid_type_error: "Obrigatório" }),
  category: z.string().max(60).optional(),
  sections: z.array(sectionSchema).min(1).max(20),
});

type ConfigureFormValues = z.infer<typeof configureSchema>;

const SOURCE_LABEL: Record<CatalogSource, string> = {
  TICKETMASTER: "Ticketmaster",
  TMDB: "TMDb",
};

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
  const [source, setSource] = useState<CatalogSource>("TICKETMASTER");
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
  } = useCatalogSearchQuery(debouncedKeyword, source);
  const createEventMutation = useCreateEventMutation();

  const form = useForm<ConfigureFormValues>({
    resolver: zodResolver(configureSchema),
    defaultValues: {
      description: "",
      venueName: "",
      venueCity: "",
      venueAddress: "",
      // Sem valor inicial de verdade (organizador escolhe no calendário)
      // — cast necessário porque o schema exige um Date de verdade
      // (startsAt é obrigatório), não porque o campo já nasce preenchido.
      startsAt: undefined as unknown as Date,
      category: "",
      sections: [{ name: "Pista", priceReais: 50, rowsCount: 5, seatsPerRow: 10 }],
    },
  });

  // Pré-preenche tudo que o catálogo já sabe — a Ticketmaster costuma
  // trazer local/data prontos, o TMDb já traz a sinopse (overview) mas
  // nunca local/data (não é uma sessão de cinema, é só o filme). Tudo
  // fica editável: o organizador confere e ajusta antes de publicar.
  function handleSelectEvent(item: CatalogEvent) {
    setSelected(item);
    form.setValue("description", item.description ?? "");
    form.setValue("venueName", item.venueName);
    form.setValue("venueCity", item.venueCity);
    form.setValue("venueAddress", item.venueAddress);
    form.setValue("startsAt", item.startsAt ? new Date(item.startsAt) : (undefined as unknown as Date));
    form.setValue("category", item.category ?? "");
  }

  function handleSourceChange(value: string) {
    setSource(value as CatalogSource);
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
        startsAt: values.startsAt.toISOString(),
        venueName: values.venueName,
        venueCity: values.venueCity,
        venueAddress: values.venueAddress,
        externalId: selected.externalId,
        externalSource: selected.source,
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

        <Tabs value={source} onValueChange={handleSourceChange} className="mb-6">
          <TabsList>
            <TabsTrigger value="TICKETMASTER" className="gap-1.5">
              <Music className="size-4" />
              Shows
            </TabsTrigger>
            <TabsTrigger value="TMDB" className="gap-1.5">
              <Film className="size-4" />
              Filmes
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={source === "TICKETMASTER" ? "Nome do show ou artista..." : "Nome do filme..."}
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
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <FormField
              control={form.control}
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do local</FormLabel>
                  <FormControl>
                    <Input placeholder="Arena Verzel" {...field} />
                  </FormControl>
                  {!selected.venueName && (
                    <p className="text-xs text-muted-foreground">
                      {selected.source === "TMDB"
                        ? "Filme não tem local de sessão no catálogo — informe o cinema."
                        : `A ${SOURCE_LABEL[selected.source]} não informou o local — preencha manualmente.`}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venueCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    ? `Preenchido automaticamente com o endereço que a ${SOURCE_LABEL[selected.source]} informou — confira e ajuste se precisar.`
                    : `A ${SOURCE_LABEL[selected.source]} não informou o endereço deste local — preencha manualmente.`}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{selected.source === "TMDB" ? "Data e hora da sessão" : "Data e hora"}</FormLabel>
                <FormControl>
                  <DateTimePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                {!selected.startsAt && (
                  <p className="text-xs text-muted-foreground">
                    {selected.source === "TMDB"
                      ? "Filme não tem sessão marcada no catálogo — defina o horário da exibição."
                      : `A ${SOURCE_LABEL[selected.source]} não informou uma data — preencha manualmente.`}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                {selected.description && (
                  <p className="text-xs text-muted-foreground">
                    Preenchida automaticamente com a sinopse do {SOURCE_LABEL[selected.source]} —
                    confira e ajuste se precisar.
                  </p>
                )}
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
                    ? `Preenchida automaticamente a partir da classificação da ${SOURCE_LABEL[selected.source]} — confira e ajuste se precisar.`
                    : `A ${SOURCE_LABEL[selected.source]} não classificou este item — preencha manualmente ou deixe em branco.`}
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
