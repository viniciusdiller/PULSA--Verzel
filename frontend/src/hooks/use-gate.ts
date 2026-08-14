import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { GateValidationResult } from "@/types/gate";

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
