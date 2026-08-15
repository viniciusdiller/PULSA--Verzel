"use client";

import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAcknowledgeNoticesMutation, usePendingNoticesQuery } from "@/hooks/use-notices";
import { formatCentsToBRL } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";

// Tela de desculpas que aparece assim que um cliente loga (ou já está
// logado numa aba aberta) depois que um organizador cancelou um evento
// que ele tinha pago. Não some sozinha nem fecha clicando fora — só o
// botão "Entendi" marca os avisos como vistos, pra garantir que a pessoa
// realmente viu que o dinheiro virou saldo, não sumiu.
export function PendingCancellationNotice() {
  const { user } = useAuth();
  const { data: notices } = usePendingNoticesQuery(!!user && user.role === "CUSTOMER");
  const acknowledgeMutation = useAcknowledgeNoticesMutation();

  const hasNotices = !!notices && notices.length > 0;
  const totalRefundedCents = (notices ?? []).reduce((sum, n) => sum + n.refundedCents, 0);

  async function handleAcknowledge() {
    if (!notices) return;
    try {
      await acknowledgeMutation.mutateAsync(notices.map((n) => n.id));
    } catch {
      toast.error("Não foi possível confirmar agora. Tente de novo em instantes.");
    }
  }

  // Renderização condicional de verdade, não só `open={hasNotices}` — o
  // Radix Dialog só desmonta depois que a animação de saída termina, e
  // essa animação não estava disparando aqui (achado testando no
  // navegador: o modal ficava com data-state="closed" mas continuava
  // visível e clicável na tela, bloqueando a página). Não renderizar o
  // <Dialog> nem monta essa árvore, então não tem animação de saída pra
  // travar.
  if (!hasNotices) {
    return null;
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Sentimos muito pelo transtorno
          </DialogTitle>
          <DialogDescription>
            {notices?.length === 1
              ? "Um evento que você tinha ingresso foi cancelado pelo organizador."
              : `${notices?.length ?? 0} eventos que você tinha ingresso foram cancelados pelo organizador.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {notices?.map((notice) => (
            <div
              key={notice.id}
              className="flex items-center justify-between rounded-md border border-border/60 px-4 py-3"
            >
              <span className="font-medium">{notice.eventTitle}</span>
              <span className="text-sm font-medium text-success">
                +{formatCentsToBRL(notice.refundedCents)}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          O valor pago (<strong>{formatCentsToBRL(totalRefundedCents)}</strong>) já está
          guardado como <strong>saldo na plataforma</strong> — dá pra ver no topo da tela e usar
          agora ou em qualquer compra futura, sem precisar de estorno no cartão.
        </p>

        <DialogFooter>
          <Button
            onClick={handleAcknowledge}
            disabled={acknowledgeMutation.isPending}
            className="w-full"
          >
            {acknowledgeMutation.isPending ? (
              <>
                <LoaderSignalBars size="sm" className="mr-1.5" />
                Confirmando...
              </>
            ) : (
              "Entendi"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
