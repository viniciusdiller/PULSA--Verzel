"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { roleHomePath, type Role } from "@/lib/auth";

// Só UX (esconder telas de quem não devia estar ali) — a autorização de
// verdade sempre acontece no backend via guards. Como a sessão vive em
// localStorage (não cookie), essa checagem só pode rodar no cliente,
// nunca em middleware/proxy do lado do servidor.
export function RouteGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allow.includes(user.role)) {
      router.replace(roleHomePath(user.role));
    }
  }, [isLoading, user, allow, router]);

  if (isLoading || !user || !allow.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
