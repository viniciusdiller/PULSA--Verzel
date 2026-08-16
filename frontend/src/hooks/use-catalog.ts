import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CatalogSearchResponse, CatalogSource } from "@/types/catalog";

export function useCatalogSearchQuery(keyword: string, source: CatalogSource = "TICKETMASTER") {
  return useQuery({
    queryKey: ["catalog", "search", source, keyword],
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogSearchResponse>("/catalog/events", {
        params: { source, ...(keyword ? { keyword } : {}) },
      });
      return data;
    },
    enabled: keyword.length > 1,
    retry: false,
  });
}
