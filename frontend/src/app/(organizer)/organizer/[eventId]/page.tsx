"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import {
  useMyEventQuery,
  usePublishEventMutation,
  useUnpublishEventMutation,
  useDeleteEventMutation,
  usePurgeEventMutation,
} from "@/hooks/use-organizer-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { PageLoader } from "@/components/ui/page-loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCentsToBRL, formatEventDateTime } from "@/lib/format";

export default function OrganizerEventDetailPage(props: PageProps<"/organizer/[eventId]">) {
  const { eventId } = use(props.params);
  const router = useRouter();
  const { data: event, isLoading } = useMyEventQuery(eventId);
  const publishMutation = usePublishEventMutation();
  const unpublishMutation = useUnpublishEventMutation();
  const deleteMutation = useDeleteEventMutation();
  const purgeMutation = usePurgeEventMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  function extractErrorMessage(error: unknown): string | undefined {
    return isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;
  }

  async function handlePublish() {
    try {
      await publishMutation.mutateAsync(eventId);
      toast.success("Evento publicado.");
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? "Não foi possível publicar o evento.");
    }
  }

  async function handleUnpublish() {
    try {
      await unpublishMutation.mutateAsync(eventId);
      toast.success("Evento despublicado — não aparece mais na listagem pública.");
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? "Não foi possível despublicar o evento.");
    }
  }

  async function handleDelete() {
    try {
      const result = await deleteMutation.mutateAsync(eventId);
      if (result.hardDeleted) {
        toast.success("Evento excluído.");
      } else if (result.refundedCustomers > 0) {
        toast.success(
          `Evento cancelado. ${result.refundedCustomers} cliente${result.refundedCustomers === 1 ? "" : "s"} reembolsado${result.refundedCustomers === 1 ? "" : "s"} em saldo na plataforma.`,
        );
      } else {
        toast.success("Evento cancelado.");
      }
      router.push("/organizer");
    } catch (error) {
      setDeleteDialogOpen(false);
      toast.error(extractErrorMessage(error) ?? "Não foi possível excluir o evento.");
    }
  }

  async function handlePurge() {
    try {
      await purgeMutation.mutateAsync(eventId);
      toast.success("Registro excluído definitivamente.");
      router.push("/organizer");
    } catch (error) {
      setPurgeDialogOpen(false);
      toast.error(extractErrorMessage(error) ?? "Não foi possível excluir o registro.");
    }
  }

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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link href="/organizer" className="text-sm text-muted-foreground hover:underline">
        ← Meus eventos
      </Link>

      <div className="mt-4 mb-6 flex items-center gap-3">
        <h1 className="font-heading text-3xl">{event.title}</h1>
        <Badge variant={event.status === "PUBLISHED" ? "default" : "secondary"}>
          {event.status === "DRAFT" ? "Rascunho" : event.status === "PUBLISHED" ? "Publicado" : "Cancelado"}
        </Badge>
      </div>

      <p className="text-muted-foreground">
        {event.venueName}, {event.venueCity} — {formatEventDateTime(event.startsAt)}
      </p>
      <p className="mt-4 max-w-xl leading-relaxed">{event.description}</p>

      <div className="mt-8 space-y-2">
        <h2 className="font-heading text-xl">Setores (capacidade: {event.capacity})</h2>
        {event.sections.map((section) => (
          <div
            key={section.id}
            className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3"
          >
            <span>
              {section.name} ({section.rowsCount}×{section.seatsPerRow})
            </span>
            <span className="text-muted-foreground">{formatCentsToBRL(section.priceCents)}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {event.status === "DRAFT" && (
          <Button disabled={publishMutation.isPending} onClick={handlePublish}>
            {publishMutation.isPending ? (
              <>
                <LoaderSignalBars size="sm" className="mr-1.5" />
                Publicando...
              </>
            ) : (
              "Publicar evento"
            )}
          </Button>
        )}
        {event.status === "PUBLISHED" && (
          <>
            <Button asChild variant="outline">
              <Link href={`/events/${event.id}`}>Ver página pública</Link>
            </Button>
            <Button
              variant="outline"
              disabled={unpublishMutation.isPending}
              onClick={handleUnpublish}
            >
              {unpublishMutation.isPending ? (
                <>
                  <LoaderSignalBars size="sm" className="mr-1.5" />
                  Despublicando...
                </>
              ) : (
                "Despublicar"
              )}
            </Button>
          </>
        )}
        {event.status !== "CANCELED" && (
          <>
            <Button asChild variant="outline">
              <Link href={`/organizer/${event.id}/edit`}>Editar</Link>
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Excluir evento
            </Button>
          </>
        )}
        {event.status === "CANCELED" && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setPurgeDialogOpen(true)}
          >
            Excluir registro
          </Button>
        )}
      </div>
      {event.status === "CANCELED" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Este evento foi cancelado — clientes com ingresso pago já foram reembolsados em saldo.
        </p>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir &quot;{event.title}&quot;?</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este evento? Será irreversível, e os usuários que
              compraram ingresso para ele terão o dinheiro estornado automaticamente como saldo
              na plataforma. Se ninguém comprou ainda, o evento simplesmente deixa de existir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? (
                <>
                  <LoaderSignalBars size="sm" className="mr-1.5" />
                  Excluindo...
                </>
              ) : (
                "Excluir permanentemente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir o registro de &quot;{event.title}&quot;?</DialogTitle>
            <DialogDescription>
              Isso apaga o evento definitivamente da plataforma — ele some até da lista de
              cancelados. Os clientes já foram reembolsados em saldo quando o evento foi
              cancelado; essa exclusão é só uma limpeza de registro e não afeta o saldo deles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={purgeMutation.isPending}
              onClick={handlePurge}
            >
              {purgeMutation.isPending ? (
                <>
                  <LoaderSignalBars size="sm" className="mr-1.5" />
                  Excluindo...
                </>
              ) : (
                "Excluir registro"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
