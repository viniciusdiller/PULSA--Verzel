import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PayResult, Reservation } from "@/types/reservation";

export function useHoldSeatMutation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seatId: string) => {
      const { data } = await apiClient.post<Reservation>(
        `/events/${eventId}/seats/${seatId}/hold`,
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["events", eventId, "seatmap"] });
      // Pagamento aprovado emite um ticket na hora — sem isso, "Meus
      // ingressos" continuaria mostrando a lista antiga em cache até um
      // reload manual, mesmo já tendo navegado por lá antes nesta sessão.
      if (data.ticket) {
        void queryClient.invalidateQueries({ queryKey: ["tickets", "mine"] });
      }
    },
  });
}

export function useReservationQuery(reservationId: string | null) {
  return useQuery({
    queryKey: ["reservations", reservationId],
    queryFn: async () => {
      const { data } = await apiClient.get<Reservation>(`/reservations/${reservationId}`);
      return data;
    },
    enabled: !!reservationId,
    refetchInterval: 5000,
  });
}

export function usePayReservationMutation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reservationId, cardNumber }: { reservationId: string; cardNumber: string }) => {
      const { data } = await apiClient.post<PayResult>(`/reservations/${reservationId}/pay`, {
        cardNumber,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events", eventId, "seatmap"] });
    },
  });
}
