"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { roleHomePath, roleLabel } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-lg tracking-tight">
          Elite Dev <span className="text-muted-foreground">Ingressos</span>
        </Link>

        <nav className="flex items-center gap-3">
          {isLoading ? null : user ? (
            <>
              <Link
                href={roleHomePath(user.role)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {user.name}
              </Link>
              <Badge variant="outline">{roleLabel(user.role)}</Badge>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sair
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
