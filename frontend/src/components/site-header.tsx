"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { roleHomePath, roleLabel, roleNavLabel } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Wordmark: linha perfurada em coral sob "PULSA" — referência
            direta ao "canhoto de ingresso" do guia de marca (Conceito 2),
            não um clipart genérico de logo. */}
        <Link href="/" className="flex flex-col leading-none">
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
        </Link>

        {/* No mobile a navegação principal e o logout vivem na barra
            inferior (MobileBottomNav) — o header fica só com marca +
            tema, evitando duplicar a mesma ação em dois lugares. */}
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
              <div className="mx-1 hidden items-center gap-2 sm:flex">
                <span className="text-sm text-foreground">{user.name}</span>
                <Badge variant="outline">{roleLabel(user.role)}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
                Sair
              </Button>
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
