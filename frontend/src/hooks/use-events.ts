import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EventListResponse, EventSummary, SeatMapResponse } from "@/types/event";

// page/pageSize são opcionais e retrocompatíveis: quem já chamava sem
// eles (home pública, que só usa a 1ª página) continua se comportando
// exatamente igual — só quem passa explicitamente (ex. o seletor de
// evento da portaria, paginado) manda esses parâmetros pro backend.
export function useEventsQuery(search: string, city?: string, page?: number, pageSize?: number) {
  return useQuery({
    queryKey: ["events", search, city ?? null, page ?? null, pageSize ?? null],
    queryFn: async () => {
      const { data } = await apiClient.get<EventListResponse>("/events", {
        params: {
          ...(search ? { search } : {}),
          ...(city ? { city } : {}),
          ...(page ? { page } : {}),
          ...(pageSize ? { pageSize } : {}),
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useFeaturedEventsQuery() {
  return useQuery({
    queryKey: ["events", "featured"],
    queryFn: async () => {
      const { data } = await apiClient.get<EventSummary[]>("/events/featured");
      return data;
    },
  });
}

export function useEventQuery(eventId: string) {
  return useQuery({
    queryKey: ["events", eventId],
    queryFn: async () => {
      const { data } = await apiClient.get<EventSummary>(`/events/${eventId}`);
      return data;
    },
    enabled: !!eventId,
  });
}

export function useSeatMapQuery(eventId: string) {
  return useQuery({
    queryKey: ["events", eventId, "seatmap"],
    queryFn: async () => {
      const { data } = await apiClient.get<SeatMapResponse>(`/events/${eventId}/seatmap`);
      return data;
    },
    enabled: !!eventId,
    refetchInterval: 5000,
  });
}
