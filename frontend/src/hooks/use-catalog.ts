import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CatalogSearchResponse } from "@/types/catalog";

export function useCatalogSearchQuery(keyword: string) {
  return useQuery({
    queryKey: ["catalog", "search", keyword],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogSearchResponse>("/catalog/events", {
        params: keyword ? { keyword } : undefined,
      });
      return data;
    },
    enabled: keyword.length > 1,
    retry: false,
  });
}
