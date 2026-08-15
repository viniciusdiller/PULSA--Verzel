"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, Home, LogIn, PlusCircle, ScanLine, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LimelightNav, type NavItem } from "@/components/ui/limelight-nav";

interface BottomNavItem {
  id: string;
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  href: string;
}

// Itens por papel — cada um leva a uma rota real (não é decorativo).
// "Sair" não mora aqui: colocá-lo como item da barra o deixava colado ao
// item de navegação vizinho (ex. "Ingressos"), e um toque um pouco fora do
// alvo do item real acabava disparando logout sem querer. A ação de sair
// vive isolada no header (visível em todas as larguras).
function getItemsForRole(role: string | undefined): BottomNavItem[] {
  switch (role) {
    case "CUSTOMER":
      return [
        { id: "home", icon: <Home />, label: "Início", href: "/" },
        { id: "tickets", icon: <Ticket />, label: "Ingressos", href: "/my-tickets" },
      ];
    case "ORGANIZER":
      return [
        { id: "home", icon: <Home />, label: "Início", href: "/" },
        { id: "events", icon: <CalendarDays />, label: "Eventos", href: "/organizer" },
        { id: "new", icon: <PlusCircle />, label: "Novo evento", href: "/organizer/new" },
      ];
    case "GATE_STAFF":
      return [
        { id: "home", icon: <Home />, label: "Início", href: "/" },
        { id: "gate", icon: <ScanLine />, label: "Portaria", href: "/gate" },
      ];
    default:
      return [
        { id: "home", icon: <Home />, label: "Início", href: "/" },
        { id: "login", icon: <LogIn />, label: "Entrar", href: "/login" },
      ];
  }
}

// Navegação inferior só-mobile (sm:hidden) — o header segue cuidando da
// navegação em telas maiores. Ativo é derivado da rota atual via
// usePathname, não de estado de clique isolado, pra refletir a URL real
// mesmo em navegação direta/reload.
export function MobileBottomNav() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const items = useMemo(() => getItemsForRole(user?.role), [user?.role]);

  const activeIndex = useMemo(() => {
    const matched = items.findIndex((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
    );
    return matched === -1 ? 0 : matched;
  }, [items, pathname]);

  if (isLoading) return null;

  const navItems: NavItem[] = items.map((item) => ({
    id: item.id,
    icon: item.icon,
    label: item.label,
    onClick: () => router.push(item.href),
  }));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden">
      <LimelightNav
        items={navItems}
        activeIndex={activeIndex}
        className="shadow-card-hover backdrop-blur"
      />
    </div>
  );
}
