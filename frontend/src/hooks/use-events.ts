import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EventListResponse, EventSummary, SeatMapResponse } from "@/types/event";

export function useEventsQuery(search: string) {
  return useQuery({
    queryKey: ["events", search],
    queryFn: async () => {
      const { data } = await apiClient.get<EventListResponse>("/events", {
        params: search ? { search } : undefined,
      });
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
