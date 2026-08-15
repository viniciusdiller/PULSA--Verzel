"use client";

import { useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";

import { useEventsQuery } from "@/hooks/use-events";
import { useValidateTicketMutation } from "@/hooks/use-gate";
import { QrScanner } from "@/components/gate/qr-scanner";
import { GateResult } from "@/components/gate/gate-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const { data: eventsData, isLoading: eventsLoading } = useEventsQuery("");
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
        <h1 className="font-heading mb-8 text-3xl">Qual evento você está checando?</h1>

        {eventsLoading ? (
          <PageLoader label="Carregando eventos..." />
        ) : eventsData && eventsData.items.length > 0 ? (
          <div className="space-y-3">
            {eventsData.items.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer transition-colors hover:border-foreground/30"
                onClick={() => setSelectedEventId(event.id)}
              >
                <CardContent className="py-4">
                  <h2 className="font-heading text-lg">{event.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {event.venueCity} • {formatEventDateTime(event.startsAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Nenhum evento publicado no momento.</p>
        )}
      </main>
    );
  }

  const selectedEvent = eventsData?.items.find((e) => e.id === selectedEventId);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Portaria</p>
          <h1 className="font-heading text-2xl">{selectedEvent?.title ?? "Evento"}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSelectedEventId(null)}>
          Trocar evento
        </Button>
      </div>

      {/* Abre em "Digitar código" por padrão — só pede permissão de câmera
          quando o usuário escolhe essa aba explicitamente, não assim que a
          tela carrega (má prática pedir câmera sem o usuário ter pedido). */}
      <Tabs defaultValue="manual">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="camera" className="flex-1">
            Câmera
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            Digitar código
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <QrScanner onDecode={validate} paused={validateMutation.isPending || !!result} />
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
            />
            <Button type="submit" disabled={validateMutation.isPending}>
              {validateMutation.isPending ? (
                <LoaderSignalBars size="sm" />
              ) : (
                "Validar"
              )}
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
