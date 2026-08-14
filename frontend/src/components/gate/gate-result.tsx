"use client";

import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { formatEventDateTime } from "@/lib/format";
import type { GateValidationResult } from "@/types/gate";

const CONFIG = {
  VALID: {
    label: "Válido",
    bg: "bg-emerald-600",
    Icon: CheckCircle2,
  },
  ALREADY_USED: {
    label: "Já utilizado",
    bg: "bg-amber-600",
    Icon: Clock,
  },
  WRONG_EVENT: {
    label: "Evento errado",
    bg: "bg-sky-600",
    Icon: AlertTriangle,
  },
  INVALID: {
    label: "Inválido",
    bg: "bg-destructive",
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
  const { label, bg, Icon } = CONFIG[result.outcome];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center text-white ${bg}`}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.4 }}
      >
        <Icon className="h-24 w-24" strokeWidth={1.5} />
      </motion.div>

      <h1 className="text-4xl font-bold tracking-tight">{label}</h1>
      <p className="max-w-sm text-white/90">{result.message}</p>

      {result.ticket && (
        <div className="mt-2 space-y-1 text-sm text-white/80">
          <p>Assento {result.ticket.seatLabel}</p>
          <p>{result.ticket.eventTitle}</p>
        </div>
      )}

      {result.outcome === "ALREADY_USED" && result.usedAt && (
        <p className="text-sm text-white/80">
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
