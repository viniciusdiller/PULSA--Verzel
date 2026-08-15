"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import type { AuthUser } from "@/lib/auth";

export function useAuth() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hydrate = useAuthStore((state) => state.hydrate);
  const storeLogin = useAuthStore((state) => state.login);
  const storeUpdateUser = useAuthStore((state) => state.updateUser);
  const storeLogout = useAuthStore((state) => state.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function login(accessToken: string, authUser: AuthUser) {
    storeLogin(accessToken, authUser);
  }

  function updateUser(authUser: AuthUser) {
    storeUpdateUser(authUser);
  }

  function logout() {
    storeLogout();
    router.push("/login");
  }

  return { user, isLoading, login, updateUser, logout };
}
