import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { EventSummary } from "@/types/event";

export function useMyEventsQuery() {
  return useQuery({
    queryKey: ["organizer", "events"],
    queryFn: async () => {
      const { data } = await apiClient.get<EventSummary[]>("/events/organizer/mine");
      return data;
    },
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

export function useDeleteEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      await apiClient.delete(`/events/${eventId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer", "events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
