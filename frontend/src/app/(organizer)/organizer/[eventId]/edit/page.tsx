"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { useMyEventQuery, useUpdateEventMutation } from "@/hooks/use-organizer-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/page-loader";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SectionsFieldArray } from "@/components/organizer/sections-field-array";
import { sectionSchema, sectionsToPriceCents, type SectionFormValues } from "@/lib/event-section-schema";
import { EVENTS_MAX_CAPACITY } from "@/lib/event-constants";
import type { EventSummary } from "@/types/event";
import type { AsyncRouteProps } from "@/types/next-page";

const editSchema = z.object({
  description: z.string().min(10, "Descreva o evento em pelo menos 10 caracteres"),
  venueAddress: z.string().min(1, "Obrigatório"),
  category: z.string().max(60).optional(),
  sections: z.array(sectionSchema).min(1).max(20),
});

type EditFormValues = z.infer<typeof editSchema>;

function sectionsEqual(a: SectionFormValues[], b: SectionFormValues[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function EditEventPage(props: AsyncRouteProps<{ eventId: string }>) {
  const { eventId } = use(props.params);
  const { data: event, isLoading } = useMyEventQuery(eventId);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <PageLoader />
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Evento não encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/organizer">Voltar</Link>
        </Button>
      </main>
    );
  }

  // Só monta o formulário quando o evento já existe — assim os
  // `defaultValues` do useForm já nascem certos, sem precisar de um
  // reset() num efeito depois que os dados chegam.
  return <EditEventForm event={event} />;
}

function EditEventForm({ event }: { event: EventSummary }) {
  const router = useRouter();
  const updateMutation = useUpdateEventMutation(event.id);

  const initialSections: SectionFormValues[] = event.sections.map((s) => ({
    name: s.name,
    priceReais: s.priceCents / 100,
    rowsCount: s.rowsCount,
    seatsPerRow: s.seatsPerRow,
  }));

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      description: event.description,
      venueAddress: event.venueAddress,
      category: event.category ?? "",
      sections: initialSections,
    },
  });

  async function onSubmit(values: EditFormValues) {
    try {
      const totalSeats = values.sections.reduce((sum, s) => sum + s.rowsCount * s.seatsPerRow, 0);
      if (totalSeats > EVENTS_MAX_CAPACITY) {
        toast.error(`Capacidade total (${totalSeats}) excede o máximo de ${EVENTS_MAX_CAPACITY} assentos.`);
        return;
      }

      // Só manda `sections` se algo mudou de verdade — assim, editar só a
      // descrição/endereço de um evento que já tem reservas nunca esbarra
      // na trava de "não dá pra mexer em setor com reserva existente".
      const sectionsChanged = !sectionsEqual(values.sections, initialSections);

      await updateMutation.mutateAsync({
        description: values.description,
        venueAddress: values.venueAddress,
        category: values.category || "",
        ...(sectionsChanged ? { sections: sectionsToPriceCents(values.sections) } : {}),
      });
      toast.success("Evento atualizado.");
      router.push(`/organizer/${event.id}`);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível salvar as alterações.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href={`/organizer/${event.id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {event.title}
      </Link>
      <h1 className="font-heading mt-4 mb-6 text-3xl">Editar evento</h1>

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

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <FormControl>
                  <Input placeholder="Music, Sports, Arts & Theatre..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <SectionsFieldArray control={form.control} maxCapacity={EVENTS_MAX_CAPACITY} />
          <p className="text-xs text-muted-foreground">
            Se este evento já tiver alguma reserva (mesmo expirada ou cancelada), alterar os
            setores será recusado — descrição e endereço continuam editáveis sempre.
          </p>

          <Button type="submit" size="lg" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <LoaderSignalBars size="sm" className="mr-1.5" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </form>
      </Form>
    </main>
  );
}
