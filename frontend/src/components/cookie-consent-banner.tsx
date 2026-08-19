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
    <>
      <div
        aria-hidden
        className="h-px w-full shrink-0 sm:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-border) 0 6px, transparent 6px 12px)",
        }}
      />
      <div
        aria-hidden
        className="hidden shrink-0 self-stretch sm:block sm:w-px"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, var(--color-border) 0 6px, transparent 6px 12px)",
        }}
      />
    </>
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
      className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-sm overflow-hidden rounded-2xl bg-card shadow-card-hover ring-1 ring-foreground/10 sm:inset-x-0 sm:bottom-0 sm:mx-0 sm:max-w-none sm:rounded-none sm:rounded-t-2xl sm:ring-0 sm:border-t sm:border-border"
      role="dialog"
      aria-label="Aviso sobre cookies"
    >
      <div className="flex flex-col sm:mx-auto sm:max-w-5xl sm:flex-row sm:items-center">
        <div className="flex items-start gap-3 p-5 sm:flex-1 sm:items-center sm:py-4">
          <Cookie className="mt-0.5 size-5 shrink-0 text-primary sm:mt-0" />
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

        <div className="flex items-center justify-end gap-3 p-3 sm:shrink-0 sm:py-4 sm:pl-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => choose("essential")}
          >
            Somente essenciais
          </Button>
          <Button size="sm" onClick={() => choose("all")}>
            Aceitar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
