import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CancellationNotice } from "@/types/notice";

export function usePendingNoticesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["notices", "pending"],
    queryFn: async () => {
      const { data } = await apiClient.get<CancellationNotice[]>("/notices/pending");
      return data;
    },
    enabled,
  });
}

export function useAcknowledgeNoticesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await apiClient.post("/notices/acknowledge", { ids });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notices", "pending"] });
      // O saldo já foi creditado no momento do cancelamento — invalidar
      // aqui só garante que o chip do header/perfil reflita, caso essa
      // requisição já tivesse resolvido antes com um valor desatualizado.
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
