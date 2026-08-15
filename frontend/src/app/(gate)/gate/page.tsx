"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { KeyRound, Search, ScanLine } from "lucide-react";
import { motion } from "motion/react";

import { useEventsQuery } from "@/hooks/use-events";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useValidateTicketMutation } from "@/hooks/use-gate";
import { QrScanner } from "@/components/gate/qr-scanner";
import { GateResult } from "@/components/gate/gate-result";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { PageLoader } from "@/components/ui/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEventDateTime } from "@/lib/format";
import type { GateValidationResult } from "@/types/gate";

export default function GatePage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<GateValidationResult | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 450);

  const { data: eventsData, isLoading: eventsLoading } = useEventsQuery(debouncedSearch);
  const validateMutation = useValidateTicketMutation(selectedEventId ?? "");

  async function validate(code: string) {
    if (!selectedEventId || validateMutation.isPending) return;
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      const outcome = await validateMutation.mutateAsync(trimmed);
      setResult(outcome);
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message ?? "Não foi possível validar o ingresso.");
    }
  }

  function dismissResult() {
    setResult(null);
    setManualCode("");
  }

  if (!selectedEventId) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Portaria</p>
        <h1 className="font-heading mb-6 text-3xl">Qual evento você está checando?</h1>

        <div className="relative mb-6 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar evento por nome..."
            className="pl-9"
          />
        </div>

        {eventsLoading ? (
          <PageLoader label="Carregando eventos..." />
        ) : eventsData && eventsData.items.length > 0 ? (
          <div className="space-y-3">
            {eventsData.items.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card
                  className="cursor-pointer overflow-hidden py-0 shadow-card transition-shadow hover:shadow-card-hover"
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden bg-muted">
                      {event.imageUrl ? (
                        <Image
                          src={event.imageUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <span className="font-heading text-xl">{event.title.slice(0, 1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 py-3 pr-4">
                      <h2 className="font-heading truncate text-lg">{event.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {event.venueCity} • {formatEventDateTime(event.startsAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            {search
              ? "Nenhum evento encontrado para essa busca."
              : "Nenhum evento publicado no momento."}
          </p>
        )}
      </main>
    );
  }

  const selectedEvent = eventsData?.items.find((e) => e.id === selectedEventId);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <div className="relative mb-8 overflow-hidden rounded-2xl shadow-card">
        <div className="relative h-32 w-full bg-muted">
          {selectedEvent?.imageUrl ? (
            <Image
              src={selectedEvent.imageUrl}
              alt=""
              fill
              sizes="448px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-violet to-[#241636]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.2em] text-white/75 uppercase">Portaria</p>
            <h1 className="font-heading truncate text-xl text-white">
              {selectedEvent?.title ?? "Evento"}
            </h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0 bg-white/15 text-white hover:bg-white/25 active:bg-white/30"
            onClick={() => setSelectedEventId(null)}
          >
            Trocar evento
          </Button>
        </div>
      </div>

      {/* Abre em "Digitar código" por padrão — só pede permissão de câmera
          quando o usuário escolhe essa aba explicitamente, não assim que a
          tela carrega (má prática pedir câmera sem o usuário ter pedido). */}
      <Tabs defaultValue="manual">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="camera" className="flex-1 gap-1.5">
            <ScanLine className="size-4" />
            Câmera
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 gap-1.5">
            <KeyRound className="size-4" />
            Digitar código
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <div className="relative mx-auto w-full max-w-xs">
            <QrScanner onDecode={validate} paused={validateMutation.isPending || !!result} />
            {/* Cantos em L, estética de mira de leitor de QR — só decoração
                (a lib já desenha o próprio quadro de captura por baixo),
                mas deixa claro que é uma área de leitura, não um vídeo qualquer. */}
            <div className="pointer-events-none absolute inset-4 rounded-lg">
              <span className="absolute top-0 left-0 size-6 rounded-tl-lg border-t-2 border-l-2 border-primary" />
              <span className="absolute top-0 right-0 size-6 rounded-tr-lg border-t-2 border-r-2 border-primary" />
              <span className="absolute bottom-0 left-0 size-6 rounded-bl-lg border-b-2 border-l-2 border-primary" />
              <span className="absolute right-0 bottom-0 size-6 rounded-br-lg border-r-2 border-b-2 border-primary" />
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Aponte a câmera para o QR do ingresso.
          </p>
        </TabsContent>

        <TabsContent value="manual">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void validate(manualCode);
            }}
            className="flex gap-2"
          >
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Cole ou digite o código do ingresso"
              className="text-center font-mono tracking-widest"
              autoFocus
            />
            <Button type="submit" disabled={validateMutation.isPending}>
              {validateMutation.isPending ? <LoaderSignalBars size="sm" /> : "Validar"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Sem AnimatePresence/exit animation aqui de propósito: numa tela
          crítica pra operação (portaria), confiabilidade do "some na hora"
          importa mais que a transição de saída — em teste, a animação de
          saída deixava o overlay travado no DOM (opacity:0 mas ainda
          capturando cliques da tela inteira) quando validações batiam em
          sequência rápida. */}
      {result && <GateResult result={result} onDismiss={dismissResult} />}
    </main>
  );
}
