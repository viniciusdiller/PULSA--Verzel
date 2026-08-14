"use client";

import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { formatEventDateTime } from "@/lib/format";
import type { GateValidationResult } from "@/types/gate";

// Reaproveita as cores da identidade PULSA em vez de inventar tons novos
// (o guia de marca não define "sucesso"/"erro"/"aviso" — ver plano):
// lime = sucesso/válido, champagne = aviso/já-utilizado, azul-esportes =
// informação, e um vermelho distinto do coral (que é o CTA em todo o
// resto do app) para inválido.
const CONFIG = {
  VALID: {
    label: "Válido",
    bg: "bg-success",
    fg: "text-success-foreground",
    fgMuted: "text-success-foreground/70",
    Icon: CheckCircle2,
  },
  ALREADY_USED: {
    label: "Já utilizado",
    bg: "bg-warning",
    fg: "text-warning-foreground",
    fgMuted: "text-warning-foreground/70",
    Icon: Clock,
  },
  WRONG_EVENT: {
    label: "Evento errado",
    bg: "bg-info",
    fg: "text-info-foreground",
    fgMuted: "text-info-foreground/80",
    Icon: AlertTriangle,
  },
  INVALID: {
    label: "Inválido",
    bg: "bg-destructive",
    fg: "text-white",
    fgMuted: "text-white/85",
    Icon: XCircle,
  },
} as const;

export function GateResult({
  result,
  onDismiss,
}: {
  result: GateValidationResult;
  onDismiss: () => void;
}) {
  const { label, bg, fg, fgMuted, Icon } = CONFIG[result.outcome];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center ${bg} ${fg}`}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.4 }}
      >
        <Icon className="h-24 w-24" strokeWidth={1.5} />
      </motion.div>

      <h1 className="text-4xl font-bold tracking-tight">{label}</h1>
      <p className={`max-w-sm ${fgMuted}`}>{result.message}</p>

      {result.ticket && (
        <div className={`mt-2 space-y-1 text-sm ${fgMuted}`}>
          <p>Assento {result.ticket.seatLabel}</p>
          <p>{result.ticket.eventTitle}</p>
        </div>
      )}

      {result.outcome === "ALREADY_USED" && result.usedAt && (
        <p className={`text-sm ${fgMuted}`}>
          Validado em {formatEventDateTime(result.usedAt)}
        </p>
      )}

      <Button
        size="lg"
        variant="secondary"
        className="mt-8"
        onClick={onDismiss}
        autoFocus
      >
        Validar próximo
      </Button>
    </motion.div>
  );
}
