import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EventListResponse, EventStatus, EventSummary } from "@/types/event";

export interface MyEventsFilters {
  status?: EventStatus;
  page?: number;
  pageSize?: number;
}

export function useMyEventsQuery(filters: MyEventsFilters = {}) {
  const { status, page = 1, pageSize = 10 } = filters;
  return useQuery({
    queryKey: ["organizer", "events", { status, page, pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get<EventListResponse>("/events/organizer/mine", {
        params: { ...(status ? { status } : {}), page, pageSize },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

// Usado pelas telas de detalhe/edição — pega só o evento que interessa,
// em vez de puxar a lista paginada inteira e procurar o id nela (o que
// quebraria assim que o organizador tivesse mais eventos do que cabem
// numa página).
export function useMyEventQuery(eventId: string) {
  return useQuery({
    queryKey: ["organizer", "events", "detail", eventId],
    queryFn: async () => {
      const { data } = await apiClient.get<EventSummary>(`/events/organizer/mine/${eventId}`);
      return data;
    },
    enabled: !!eventId,
  });
}

export interface CreateSectionInput {
  name: string;
  priceCents: number;
  rowsCount: number;
  seatsPerRow: number;
}

export interface CreateEventInput {
  title: string;
  description: string;
  imageUrl?: string;
  startsAt: string;
  venueName: string;
  venueCity: string;
  venueAddress: string;
  externalId: string;
  externalSource?: string;
  sections: CreateSectionInput[];
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data } = await apiClient.post<EventSummary>("/events", input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
    },
  });
}

export function usePublishEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await apiClient.patch<EventSummary>(`/events/${eventId}/publish`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUnpublishEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await apiClient.patch<EventSummary>(`/events/${eventId}/unpublish`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export interface UpdateEventInput {
  description?: string;
  venueAddress?: string;
  sections?: CreateSectionInput[];
}

export function useUpdateEventMutation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateEventInput) => {
      const { data } = await apiClient.patch<EventSummary>(`/events/${eventId}`, input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export interface DeleteEventResult {
  hardDeleted: boolean;
  refundedCustomers: number;
}

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data } = await apiClient.delete<DeleteEventResult>(`/events/${eventId}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// Só disponível para eventos já CANCELED — apaga o registro de vez
// (some até do filtro "Cancelado"), diferente de useDeleteEventMutation
// que, com reservas existentes, cancela com estorno em vez de excluir.
export function usePurgeEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await apiClient.delete(`/events/${eventId}/purge`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
