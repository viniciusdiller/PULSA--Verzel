import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TicketWithDetails } from "@/types/ticket";
import type { Reservation } from "@/types/reservation";

export function useMyTicketsQuery() {
  return useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: async () => {
      const { data } = await apiClient.get<TicketWithDetails[]>("/tickets/mine");
      return data;
    },
  });
}

export interface CancelPaidTicketResult {
  reservation: Reservation;
  refundedCents: number;
}

// Desistência depois de já ter pago — diferente do cancelamento de hold
// no checkout (esse aqui invalida o ticket já emitido e credita o valor
// em saldo). Invalida "tickets/mine" (o ticket agora aparece como VOID
// na aba "Passados") e "profile" (o saldo creditado precisa refletir no
// chip do header na hora, sem esperar reload).
export function useCancelPaidTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { data } = await apiClient.post<CancelPaidTicketResult>(
        `/reservations/${reservationId}/cancel-paid`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useTicketByShareSlugQuery(shareSlug: string) {
  return useQuery({
    queryKey: ["tickets", "share", shareSlug],
    queryFn: async () => {
      const { data } = await apiClient.get<Omit<TicketWithDetails, "ownerId">>(
        `/tickets/${shareSlug}`,
      );
      return data;
    },
    enabled: !!shareSlug,
  });
}
