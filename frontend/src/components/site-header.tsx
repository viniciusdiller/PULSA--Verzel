"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useProfileQuery } from "@/hooks/use-profile";
import { roleHomePath, roleLabel, roleNavLabel } from "@/lib/auth";
import { formatCentsToBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  // Saldo em tempo quase real: recarrega ao focar a aba, então um cliente
  // que estava com o app aberto quando um evento foi cancelado vê o saldo
  // novo assim que volta pra essa aba, sem precisar recarregar a página.
  const { data: profile } = useProfileQuery(!!user);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Símbolo oficial (arte final entregue pelo usuário) + wordmark
            "PULSA" com linha perfurada em coral sob o texto — referência
            direta ao "canhoto de ingresso" do guia de marca (Conceito 2). */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/pulsa-simbolo-isolado.png"
            alt=""
            aria-hidden
            width={32}
            height={32}
            priority
            className="h-8 w-8 shrink-0"
          />
          <span className="flex flex-col leading-none">
            <span className="font-heading text-xl font-bold tracking-tight text-foreground">
              PULSA
            </span>
            <span
              aria-hidden
              className="mt-1 h-px w-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--color-primary) 0 6px, transparent 6px 12px)",
              }}
            />
          </span>
        </Link>

        {/* No mobile a navegação principal vive na barra inferior
            (MobileBottomNav) — o header fica com marca + tema em todas as
            larguras. "Sair" não mora mais aqui: fica isolado na página de
            perfil, e o espaço que ele ocupava virou o saldo da plataforma
            (visível pra qualquer papel — só CUSTOMER acumula saldo de
            estorno, mas mostrar R$0,00 pros outros não confunde ninguém e
            mantém o header consistente entre papéis). */}
        <nav className="flex items-center gap-2">
          {isLoading ? null : user ? (
            <>
              <Link
                href={roleHomePath(user.role)}
                className={cn(
                  "hidden rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:cursor-pointer hover:bg-muted hover:text-foreground sm:block",
                  pathname === roleHomePath(user.role)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {roleNavLabel(user.role)}
              </Link>
              <Link
                href="/profile"
                className={cn(
                  "mx-1 hidden items-center gap-2 rounded-full px-2 py-1 transition-colors hover:cursor-pointer hover:bg-muted sm:flex",
                  pathname === "/profile" ? "bg-muted" : "",
                )}
              >
                <span className="text-sm text-foreground">{user.name}</span>
                <Badge variant="outline">{roleLabel(user.role)}</Badge>
              </Link>
              <Link
                href="/profile"
                className="rounded-full transition-transform hover:cursor-pointer hover:scale-105"
                aria-label="Saldo — ver perfil"
              >
                <Badge variant="success">
                  Saldo: {formatCentsToBRL(profile?.balanceCents ?? 0)}
                </Badge>
              </Link>
              <ThemeToggle />
            </>
          ) : (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Entrar</Link>
              </Button>
              <ThemeToggle />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
