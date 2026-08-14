"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { roleHomePath, roleLabel, roleNavLabel } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-heading text-lg tracking-tight">
          Elite Dev <span className="text-muted-foreground">Ingressos</span>
        </Link>

        <nav className="flex items-center gap-4">
          {isLoading ? null : user ? (
            <>
              <Link
                href={roleHomePath(user.role)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  pathname === roleHomePath(user.role)
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {roleNavLabel(user.role)}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{user.name}</span>
                <Badge variant="outline">{roleLabel(user.role)}</Badge>
              </div>
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
