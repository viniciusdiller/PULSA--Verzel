"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, useFieldArray } from "react-hook-form";
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
import { PageLoader } from "@/components/ui/page-loader";
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
  priceCents: z.coerce.number().int().min(0),
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
      sections: [{ name: "Pista", priceCents: 5000, rowsCount: 5, seatsPerRow: 10 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "sections" });

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
        sections: values.sections,
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
                  append({ name: "", priceCents: 5000, rowsCount: 5, seatsPerRow: 10 })
                }
              >
                + Setor
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                <FormField
                  control={form.control}
                  name={`sections.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Nome do setor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`sections.${index}.priceCents`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" placeholder="Preço (centavos)" {...field} />
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
                      <FormControl>
                        <Input type="number" placeholder="Fileiras" {...field} />
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
                      <FormControl>
                        <Input type="number" placeholder="Assentos/fileira" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fields.length === 1}
                  onClick={() => remove(index)}
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" size="lg" disabled={createEventMutation.isPending}>
            {createEventMutation.isPending ? "Criando..." : "Criar evento (rascunho)"}
          </Button>
        </form>
      </Form>
    </main>
  );
}
