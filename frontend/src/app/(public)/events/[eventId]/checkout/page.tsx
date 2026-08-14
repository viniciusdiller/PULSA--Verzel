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
import { useHoldSeatMutation, usePayReservationMutation } from "@/hooks/use-reservation";
import { useCountdown, formatCountdown } from "@/hooks/use-countdown";
import { SeatMap } from "@/components/seatmap/seat-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

const paymentSchema = z.object({
  cardNumber: z.string().min(13, "Número de cartão muito curto"),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? fallback;
  }
  return fallback;
}

export default function CheckoutPage(props: PageProps<"/events/[eventId]/checkout">) {
  const { eventId } = use(props.params);
  const { user, isLoading: authLoading } = useAuth();

  const { data: seatMap, isLoading: seatMapLoading } = useSeatMapQuery(eventId);
  const holdMutation = useHoldSeatMutation(eventId);
  const payMutation = usePayReservationMutation(eventId);

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payResult, setPayResult] = useState<PayResult | null>(null);

  const remainingMs = useCountdown(reservation?.status === "HOLDING" ? reservation.holdExpiresAt : null);
  const expired = reservation?.status === "HOLDING" && remainingMs <= 0;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { cardNumber: "" },
  });

  async function handleSelectSeat(seat: Seat) {
    try {
      const created = await holdMutation.mutateAsync(seat.id);
      setReservation(created);
      toast.success(`Assento ${seat.label} reservado por 7 minutos.`);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Não foi possível reservar este assento."));
    }
  }

  async function onSubmitPayment(values: PaymentFormValues) {
    if (!reservation) return;
    try {
      const result = await payMutation.mutateAsync({
        reservationId: reservation.id,
        cardNumber: values.cardNumber,
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
    form.reset();
  }

  if (authLoading || seatMapLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Skeleton className="h-64 w-full" />
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
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-xl">Pagamento</CardTitle>
              <span
                className={`text-sm tabular-nums ${expired ? "text-destructive" : "text-muted-foreground"}`}
              >
                {expired ? "Expirado" : formatCountdown(remainingMs)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Total: {formatCentsToBRL(reservation.totalCents)}
            </p>

            {expired ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  O tempo da sua reserva esgotou. Escolha um assento novamente.
                </p>
                <Button onClick={resetToSeatSelection}>Voltar ao mapa</Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitPayment)} className="grid gap-4">
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
                    Teste: 4242 4242 4242 4242 aprova sempre; 4000 0000 0000 0002 recusa sempre.
                  </p>
                  <Button type="submit" disabled={payMutation.isPending}>
                    {payMutation.isPending ? "Processando..." : "Pagar"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={resetToSeatSelection}>
                    Cancelar e escolher outro assento
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
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
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
            disabled={holdMutation.isPending}
            onSelectSeat={handleSelectSeat}
          />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
