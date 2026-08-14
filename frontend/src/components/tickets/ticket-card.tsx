"use client";

import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
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

const STATUS_VARIANT: Record<TicketWithDetails["status"], "default" | "secondary" | "destructive"> = {
  VALID: "default",
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

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="rounded-lg border border-border/60 bg-white p-3">
          <QRCodeSVG value={ticket.qrToken} size={140} />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h3 className="font-heading text-xl">{ticket.event.title}</h3>
            <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {ticket.event.venueName}, {ticket.event.venueCity} —{" "}
            {formatEventDateTime(ticket.event.startsAt)}
          </p>
          <p className="text-sm">Assento {ticket.seat.label}</p>
          {ticket.usedAt && (
            <p className="text-xs text-muted-foreground">
              Utilizado em {formatEventDateTime(ticket.usedAt)}
            </p>
          )}

          {showShareButton && (
            <Button variant="outline" size="sm" onClick={copyShareLink} className="mt-2">
              Copiar link de compartilhamento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
