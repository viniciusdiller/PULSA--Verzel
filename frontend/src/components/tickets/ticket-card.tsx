"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Armchair, Clock3, Copy, MapPin, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventDateTime } from "@/lib/format";
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
}: {
  ticket: Omit<TicketWithDetails, "ownerId">;
  showShareButton?: boolean;
}) {
  async function copyShareLink() {
    const url = `${window.location.origin}/t/${ticket.shareSlug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(ticket.shortCode);
    toast.success("Código copiado.");
  }

  return (
    <Card className="overflow-hidden py-0 shadow-card">
      {/* Banner do evento — mesmo tratamento de imagem já usado no
          seletor de evento da portaria. Título/status ficam FORA da
          imagem (não sobrepostos): títulos longos de show quebram em
          2+ linhas e um badge flutuando por cima virava sobreposição
          feia em telas estreitas. */}
      <div className="relative h-28 w-full shrink-0 overflow-hidden sm:h-32">
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
      </div>

      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h3 className="font-heading text-lg leading-tight text-foreground sm:text-xl">
            {ticket.event.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {ticket.event.venueName}, {ticket.event.venueCity} —{" "}
              {formatEventDateTime(ticket.event.startsAt)}
            </span>
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[ticket.status]} className="mt-1 shrink-0">
          {STATUS_LABEL[ticket.status]}
        </Badge>
      </div>

      {/* Linha perfurada — mesmo motivo de "canhoto de ingresso" do
          wordmark PULSA (site-header), aqui separando o cartaz do evento
          da parte funcional (QR/código) do ingresso. */}
      <div
        aria-hidden
        className="mt-4 h-px w-full"
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

          {showShareButton && (
            <Button variant="outline" size="sm" onClick={copyShareLink} className="mt-2">
              <Share2 className="size-3.5" />
              Copiar link de compartilhamento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
