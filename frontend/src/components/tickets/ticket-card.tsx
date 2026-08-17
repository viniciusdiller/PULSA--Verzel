"use client";

import { useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Armchair, Clock3, Copy, MapPin, Share2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCentsToBRL, formatEventDateTime } from "@/lib/format";
import { useCancelPaidTicketMutation } from "@/hooks/use-tickets";
import type { TicketWithDetails } from "@/types/ticket";

const STATUS_LABEL: Record<TicketWithDetails["status"], string> = {
  VALID: "Válido",
  USED: "Utilizado",
  VOID: "Inválido",
};

const STATUS_VARIANT: Record<TicketWithDetails["status"], "success" | "secondary" | "destructive"> = {
  VALID: "success",
  USED: "secondary",
  VOID: "destructive",
};

export function TicketCard({
  ticket,
  showShareButton = true,
  allowCancel = false,
}: {
  ticket: Omit<TicketWithDetails, "ownerId">;
  showShareButton?: boolean;
  // Off por padrão de propósito: este componente também é usado na
  // página pública de compartilhamento (/t/[shareSlug]), sem
  // autenticação — cancelar só pode aparecer em "Meus ingressos", onde
  // quem está olhando é comprovadamente o dono do ingresso.
  allowCancel?: boolean;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const cancelMutation = useCancelPaidTicketMutation();

  // Date.now() é impuro — não pode rodar direto no corpo do componente
  // (regra react-hooks/purity). Como cada TicketCard é montado com uma
  // key estável por ticket (nunca reaproveitado pra outro ticket), o
  // inicializador preguiçoso do useState roda exatamente uma vez por
  // ingresso, o que já é o suficiente aqui — não precisa recalcular a
  // cada render.
  const [eventAlreadyStarted] = useState(
    () => new Date(ticket.event.startsAt).getTime() <= Date.now(),
  );
  const canCancel = allowCancel && ticket.status === "VALID" && !eventAlreadyStarted;

  async function copyShareLink() {
    const url = `${window.location.origin}/t/${ticket.shareSlug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(ticket.shortCode);
    toast.success("Código copiado.");
  }

  async function handleCancel() {
    try {
      const result = await cancelMutation.mutateAsync(ticket.reservationId);
      setCancelDialogOpen(false);
      toast.success(
        `Ingresso cancelado. ${formatCentsToBRL(result.refundedCents)} devolvidos em saldo na plataforma.`,
      );
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível cancelar este ingresso.");
    }
  }

  return (
    <Card className="overflow-hidden py-0 shadow-card">
      {/* Banner do evento — mesmo tratamento de imagem+gradiente já usado
          no seletor de evento da portaria, pra manter a linguagem visual
          consistente entre os papéis. O badge de status mora DENTRO do
          mesmo bloco de texto que o título (não mais posicionado
          separado, flutuando no topo da imagem) — assim os dois nunca
          disputam o mesmo espaço, mesmo com título de 2+ linhas. */}
      <div className="relative h-36 w-full shrink-0 overflow-hidden sm:h-40">
        {ticket.event.imageUrl ? (
          <Image
            src={ticket.event.imageUrl}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 640px) 100vw, 768px"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-violet/30 via-transparent to-primary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <Badge variant={STATUS_VARIANT[ticket.status]} className="mb-1.5">
            {STATUS_LABEL[ticket.status]}
          </Badge>
          <h3 className="font-heading line-clamp-2 text-lg leading-tight text-foreground sm:text-xl">
            {ticket.event.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {ticket.event.venueName}, {ticket.event.venueCity} —{" "}
            {formatEventDateTime(ticket.event.startsAt)}
          </p>
        </div>
      </div>

      {/* Linha perfurada — mesmo motivo de "canhoto de ingresso" do
          wordmark PULSA (site-header), aqui separando o cartaz do evento
          da parte funcional (QR/código) do ingresso. */}
      <div
        aria-hidden
        className="h-px w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-border) 0 6px, transparent 6px 12px)",
        }}
      />

      <CardContent className="flex flex-col items-center gap-4 py-5 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="rounded-lg border border-border/60 bg-white p-3">
          <QRCodeSVG value={ticket.qrToken} size={140} />
        </div>

        <div className="flex-1 space-y-2">
          <p className="flex items-center justify-center gap-1.5 text-sm sm:justify-start">
            <Armchair className="size-4 text-muted-foreground" />
            Assento {ticket.seat.label}
          </p>
          {ticket.usedAt && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
              <Clock3 className="size-3.5" />
              Utilizado em {formatEventDateTime(ticket.usedAt)}
            </p>
          )}

          <div className="mt-2 space-y-1">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Código do ingresso
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <code className="rounded-md bg-muted px-2.5 py-1.5 font-mono text-base font-semibold tracking-[0.15em]">
                {ticket.shortCode.slice(0, 3)} {ticket.shortCode.slice(3)}
              </code>
              <Button variant="outline" size="sm" onClick={copyCode}>
                <Copy className="size-3.5" />
                Copiar código
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use este código na opção &quot;Digitar código&quot; da portaria, caso o QR não possa
              ser lido.
            </p>
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            {showShareButton && (
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Share2 className="size-3.5" />
                Copiar link de compartilhamento
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="size-3.5" />
                Cancelar ingresso
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar ingresso de &quot;{ticket.event.title}&quot;?</DialogTitle>
            <DialogDescription>
              O assento {ticket.seat.label} volta a ficar disponível pra outra pessoa, e o valor
              pago é devolvido em saldo na plataforma — não tem como desfazer depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={handleCancel}
            >
              {cancelMutation.isPending ? (
                <>
                  <LoaderSignalBars size="sm" className="mr-1.5" />
                  Cancelando...
                </>
              ) : (
                "Cancelar ingresso"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
