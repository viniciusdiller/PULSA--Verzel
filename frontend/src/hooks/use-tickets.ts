import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TicketWithDetails } from "@/types/ticket";

export function useMyTicketsQuery() {
  return useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: async () => {
      const { data } = await apiClient.get<TicketWithDetails[]>("/tickets/mine");
      return data;
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
