"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  CalendarDays,
  History,
  Home,
  LogIn,
  PlusCircle,
  ScanLine,
  Ticket,
  User,
} from "lucide-react";
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
        { id: "profile", icon: <User />, label: "Perfil", href: "/profile" },
      ];
    case "ORGANIZER":
      return [
        { id: "home", icon: <Home />, label: "Início", href: "/" },
        { id: "events", icon: <CalendarDays />, label: "Eventos", href: "/organizer" },
        { id: "new", icon: <PlusCircle />, label: "Novo evento", href: "/organizer/new" },
        { id: "profile", icon: <User />, label: "Perfil", href: "/profile" },
      ];
    case "GATE_STAFF":
      // "/gate" já é a home de fato do papel (é pra onde o login manda,
      // roleHomePath já aponta pra lá) — o ícone de casa não fazia mais
      // sentido apontando pra "/", a home pública de eventos, que não
      // serve pra nada pra quem está trabalhando na portaria.
      return [
        { id: "home", icon: <ScanLine />, label: "Início", href: "/gate" },
        { id: "history", icon: <History />, label: "Histórico", href: "/gate/history" },
        { id: "profile", icon: <User />, label: "Perfil", href: "/profile" },
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

  // Pega o href mais específico que bate com a rota atual, não o primeiro
  // da lista — com startsWith puro, "/organizer/new" também "começa com"
  // "/organizer" e o item "Eventos" (que vem antes no array) ganhava o
  // foco no lugar de "Novo evento". O limite de "/" no startsWith evita
  // que "/organizer-outra-coisa" combine com "/organizer" por acidente.
  const activeIndex = useMemo(() => {
    let bestIndex = -1;
    let bestLength = -1;
    items.forEach((item, index) => {
      const isMatch =
        item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (isMatch && item.href.length > bestLength) {
        bestIndex = index;
        bestLength = item.href.length;
      }
    });
    return bestIndex === -1 ? 0 : bestIndex;
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
