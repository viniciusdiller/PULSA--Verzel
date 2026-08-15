import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  GateHistoryEventSummary,
  GateHistoryTicketsPage,
  GateValidationResult,
} from "@/types/gate";

export function useValidateTicketMutation(eventId: string) {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await apiClient.post<GateValidationResult>(
        `/gate/events/${eventId}/validate`,
        { code },
      );
      return data;
    },
  });
}

export function useGateHistoryEventsQuery() {
  return useQuery({
    queryKey: ["gate", "history", "events"],
    queryFn: async () => {
      const { data } = await apiClient.get<GateHistoryEventSummary[]>(
        "/gate/history/events",
      );
      return data;
    },
  });
}

export function useGateHistoryTicketsQuery(eventId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["gate", "history", "events", eventId, "tickets", { page, pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get<GateHistoryTicketsPage>(
        `/gate/history/events/${eventId}/tickets`,
        { params: { page, pageSize } },
      );
      return data;
    },
    enabled: !!eventId,
    placeholderData: keepPreviousData,
  });
}
