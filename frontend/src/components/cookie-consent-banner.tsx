"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  saveConsent,
  subscribeConsent,
  type CookieConsent,
} from "@/lib/cookie-consent";

// Linha perfurada — mesmo canhoto de ingresso usado no resto do app
// (header, ticket-card, perfil), aqui separando o texto da escolha em
// si. Um banner cinza genérico de "usamos cookies" em cima da
// identidade PULSA seria a cara de AI slop que o projeto evita em
// todo o resto.
function PerforatedDivider() {
  return (
    <div
      aria-hidden
      className="h-px w-full shrink-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, var(--color-border) 0 6px, transparent 6px 12px)",
      }}
    />
  );
}

// Hoje o site só guarda localStorage essencial (token de login, tema) —
// nenhum rastreamento de terceiro, nenhuma cookie de analytics/marketing.
// "Aceitar todos" e "Somente essenciais" fazem a mesma coisa na prática
// agora (não tem nada opcional pra ligar/desligar), mas a escolha fica
// salva e pronta pro dia em que isso mudar — ver docs/ARCHITECTURE.md.
export function CookieConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );
  const visible = consent === null;

  function choose(value: CookieConsent) {
    saveConsent(value);
  }

  // Sem AnimatePresence: nesse projeto (mesmo achado já documentado em
  // PendingCancellationNotice) a animação de saída fica "presa" —
  // termina em opacity:0 mas o elemento nunca desmonta, continuando no
  // DOM. Renderização condicional direta evita a classe inteira do
  // problema; só perde a animação de saída, mantém a de entrada.
  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", duration: 0.4 }}
      className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md overflow-hidden rounded-2xl bg-card shadow-card-hover ring-1 ring-foreground/10 sm:right-4 sm:bottom-4 sm:left-auto sm:inset-x-auto"
      role="dialog"
      aria-label="Aviso sobre cookies"
    >
      <div className="flex items-start gap-3 p-5">
        <Cookie className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-heading text-base text-foreground">Sobre os cookies</p>
          <p className="mt-1 text-muted-foreground">
            Usamos apenas armazenamento essencial pro login e sua preferência de tema — nada de
            rastreamento de terceiros hoje.{" "}
            <Link href="/privacidade" className="underline underline-offset-2">
              Saiba mais
            </Link>
            .
          </p>
        </div>
      </div>

      <PerforatedDivider />

      <div className="flex gap-2 p-3">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => choose("essential")}>
          Somente essenciais
        </Button>
        <Button size="sm" className="flex-1" onClick={() => choose("all")}>
          Aceitar
        </Button>
      </div>
    </motion.div>
  );
}
