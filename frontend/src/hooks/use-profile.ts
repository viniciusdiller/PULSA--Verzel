import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Profile } from "@/types/profile";

export function useProfileQuery() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await apiClient.get<Profile>("/auth/me");
      return data;
    },
  });
}

export interface UpdateProfileInput {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await apiClient.patch<Profile>("/auth/me", input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
