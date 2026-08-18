"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

import { useAuth } from "@/hooks/use-auth";
import { useSeatMapQuery } from "@/hooks/use-events";
import { useProfileQuery } from "@/hooks/use-profile";
import {
  useCancelReservationMutation,
  useHoldSeatMutation,
  usePayReservationMutation,
} from "@/hooks/use-reservation";
import { useCountdown, formatCountdown } from "@/hooks/use-countdown";
import { SeatMap } from "@/components/seatmap/seat-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { PageLoader } from "@/components/ui/page-loader";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { formatCentsToBRL } from "@/lib/format";
import type { Seat } from "@/types/event";
import type { PayResult, Reservation } from "@/types/reservation";
import type { AsyncRouteProps } from "@/types/next-page";

const paymentSchema = z.object({
  cardNumber: z.string(),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? fallback;
  }
  return fallback;
}

export default function CheckoutPage(props: AsyncRouteProps<{ eventId: string }>) {
  const { eventId } = use(props.params);
  const { user, isLoading: authLoading } = useAuth();

  const { data: seatMap, isLoading: seatMapLoading } = useSeatMapQuery(eventId);
  const { data: profile } = useProfileQuery(!!user);
  const holdMutation = useHoldSeatMutation(eventId);
  const payMutation = usePayReservationMutation(eventId);
  const cancelMutation = useCancelReservationMutation(eventId);

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [useBalance, setUseBalance] = useState(false);

  const remainingMs = useCountdown(reservation?.status === "HOLDING" ? reservation.holdExpiresAt : null);
  const expired = reservation?.status === "HOLDING" && remainingMs <= 0;
  // Escalada visual nos últimos 60s — mesmo aviso de urgência que qualquer
  // checkout real de ingresso dá antes do tempo acabar.
  const lowTime = !expired && remainingMs > 0 && remainingMs <= 60_000;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardNumber: "" },
  });

  // Clicar num assento só pré-seleciona (estado local, sem chamar o
  // backend ainda) — o hold de verdade (e o início da contagem de 7min)
  // só acontece quando o cliente confirma, em handleConfirmSeat. Isso
  // evita reservar um assento sem querer com um clique acidental antes
  // de a pessoa decidir de fato.
  function handleSelectSeat(seat: Seat) {
    setSelectedSeat(seat);
  }

  async function handleConfirmSeat() {
    if (!selectedSeat) return;
    try {
      const created = await holdMutation.mutateAsync(selectedSeat.id);
      setReservation(created);
      toast.success(`Assento ${selectedSeat.label} reservado por 7 minutos.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível reservar este assento."));
      setSelectedSeat(null);
    }
  }

  async function onSubmitPayment(values: PaymentFormValues) {
    if (!reservation) return;

    const balanceCents = profile?.balanceCents ?? 0;
    const balanceToApply = useBalance ? Math.min(balanceCents, reservation.totalCents) : 0;
    const remainingCents = reservation.totalCents - balanceToApply;

    if (remainingCents > 0 && values.cardNumber.trim().length < 13) {
      form.setError("cardNumber", { message: "Número de cartão muito curto" });
      return;
    }

    try {
      const result = await payMutation.mutateAsync({
        reservationId: reservation.id,
        ...(remainingCents > 0 ? { cardNumber: values.cardNumber } : {}),
        useBalance,
      });
      setPayResult(result);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 410) {
        toast.error("O tempo da reserva expirou. Escolha um assento novamente.");
        setReservation(null);
        return;
      }
      toast.error(extractErrorMessage(error, "Não foi possível processar o pagamento."));
    }
  }

  function resetToSeatSelection() {
    setReservation(null);
    setPayResult(null);
    setSelectedSeat(null);
    form.reset();
  }

  // Cancelamento de verdade no backend, não só reset de tela — sem isso o
  // assento continuava HELD (travado pra qualquer outra pessoa) até o TTL
  // de 7min esgotar sozinho, mesmo com o cliente já tendo desistido aqui.
  async function handleCancelReservation() {
    if (reservation) {
      try {
        await cancelMutation.mutateAsync(reservation.id);
      } catch {
        // Se já não estava mais em HOLDING (pagou/expirou em outra aba
        // entre o clique e a resposta), a intenção continua a mesma:
        // sair dessa tela. Segue o fluxo normalmente.
      }
    }
    resetToSeatSelection();
  }

  if (authLoading || seatMapLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <PageLoader />
      </main>
    );
  }

  if (!seatMap) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Evento não encontrado</h1>
      </main>
    );
  }

  if (!user || user.role !== "CUSTOMER") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="font-heading text-2xl">Entre como cliente para reservar</h1>
        <p className="text-muted-foreground">
          {user ? "Sua conta atual não é de cliente." : "Você precisa estar logado para reservar um assento."}
        </p>
        {!user && (
          <Button asChild className="mt-4">
            <Link href="/login">Entrar</Link>
          </Button>
        )}
      </main>
    );
  }

  // Resultado do pagamento
  if (payResult) {
    if (payResult.reservation.status === "PAID" && payResult.ticket) {
      return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="font-heading text-3xl">Pagamento aprovado</h1>
            <p className="mt-2 text-muted-foreground">
              Seu ingresso já está disponível em &quot;Meus ingressos&quot;.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/my-tickets">Ver meu ingresso</Link>
            </Button>
          </motion.div>
        </main>
      );
    }

    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-heading text-3xl text-destructive">Pagamento recusado</h1>
        <p className="text-muted-foreground">
          {payResult.reservation.paymentDeclineReason ?? "Cartão recusado pela operadora."}
        </p>
        <Button size="lg" className="mt-4" onClick={resetToSeatSelection}>
          Tentar novamente
        </Button>
      </main>
    );
  }

  // Hold ativo -> formulário de pagamento
  if (reservation && reservation.status === "HOLDING") {
    const balanceCents = profile?.balanceCents ?? 0;
    const balanceToApply = useBalance ? Math.min(balanceCents, reservation.totalCents) : 0;
    const remainingCents = reservation.totalCents - balanceToApply;

    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-xl">Pagamento</CardTitle>
              <span
                className={`text-sm font-medium tabular-nums ${
                  expired
                    ? "text-destructive"
                    : lowTime
                      ? "animate-pulse text-primary"
                      : "text-muted-foreground"
                }`}
              >
                {expired ? "Expirado" : formatCountdown(remainingMs)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-1 text-sm text-muted-foreground">
              Total: {formatCentsToBRL(reservation.totalCents)}
            </p>

            {expired ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  O tempo da sua reserva esgotou. Escolha um assento novamente.
                </p>
                <Button onClick={handleCancelReservation}>Voltar ao mapa</Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitPayment)} className="grid gap-4">
                  {balanceCents > 0 && (
                    <label className="mb-1 flex items-center gap-2 text-sm hover:cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useBalance}
                        onChange={(e) => setUseBalance(e.target.checked)}
                        className="size-4 rounded border-input accent-primary hover:cursor-pointer"
                      />
                      Usar meu saldo ({formatCentsToBRL(balanceCents)})
                    </label>
                  )}

                  {useBalance && (
                    <p className="-mt-2 text-xs text-muted-foreground">
                      {remainingCents === 0
                        ? `Seu saldo cobre o total — nenhum cartão necessário.`
                        : `${formatCentsToBRL(balanceToApply)} do saldo + ${formatCentsToBRL(remainingCents)} no cartão.`}
                    </p>
                  )}

                  {remainingCents > 0 && (
                    <>
                      <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número do cartão</FormLabel>
                            <FormControl>
                              <Input placeholder="4242 4242 4242 4242" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Teste: 4242 4242 4242 4242 aprova sempre; 4000 0000 0000 0002 recusa
                        sempre.
                      </p>
                    </>
                  )}
                  <Button type="submit" disabled={payMutation.isPending}>
                    {payMutation.isPending ? (
                      <>
                        <LoaderSignalBars size="sm" className="mr-1.5" />
                        Processando...
                      </>
                    ) : (
                      "Pagar"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={cancelMutation.isPending}
                    onClick={handleCancelReservation}
                  >
                    {cancelMutation.isPending
                      ? "Cancelando..."
                      : "Cancelar e escolher outro assento"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  // Seleção de assento
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href={`/events/${eventId}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Voltar ao evento
      </Link>
      <p className="mt-4 text-xs tracking-[0.2em] text-muted-foreground uppercase">
        {seatMap.event.title}
      </p>
      <h1 className="font-heading mb-8 text-3xl">Escolha seu assento</h1>

      <AnimatePresence mode="wait">
        <motion.div
          key="seatmap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <SeatMap
            seatMap={seatMap}
            pendingSeatId={selectedSeat?.id ?? null}
            disabled={holdMutation.isPending}
            onSelectSeat={handleSelectSeat}
          />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedSeat && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="sticky bottom-4 mt-8 flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-card-hover"
          >
            <div>
              <p className="text-sm text-muted-foreground">Assento selecionado</p>
              <p className="font-heading text-lg">
                {selectedSeat.label}
                {" — "}
                {formatCentsToBRL(
                  seatMap.sections.find((s) => s.id === selectedSeat.sectionId)?.priceCents ?? 0,
                )}
              </p>
            </div>
            <Button size="lg" disabled={holdMutation.isPending} onClick={handleConfirmSeat}>
              {holdMutation.isPending ? (
                <>
                  <LoaderSignalBars size="sm" className="mr-1.5" />
                  Confirmando...
                </>
              ) : (
                "Confirmar assento"
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
