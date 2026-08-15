"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChip {
  id: string;
  name: string;
  value: string;
}

interface FilterBreadcrumbProps {
  className?: string;
  filters: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

// Adaptado do padrão "filter-chips-breadcrumb" pra paleta PULSA: os
// chips viram pill neutro (bg-muted) em vez de cinza genérico — coral é
// reservado só pra CTA/estado em todo o app, nunca decoração de filtro —
// e o texto virou PT-BR. Só aparece quando existe pelo menos 1 filtro
// ativo (controlado por quem usa, não por dentro do componente).
export function FilterChipsBreadcrumb({ className, filters, onRemove, onClearAll }: FilterBreadcrumbProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl bg-muted p-2 text-foreground sm:p-3",
        className,
      )}
    >
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <span className="text-xs font-medium whitespace-nowrap sm:text-sm">Filtros:</span>
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:gap-2">
          {filters.map((filter) => (
            <span
              key={filter.id}
              className="inline-flex items-center rounded-full bg-card px-2 py-0.5 text-[10px] font-medium ring-1 ring-border sm:px-3 sm:py-1 sm:text-xs"
            >
              <span className="max-w-[140px] truncate sm:max-w-none">
                {filter.name}: {filter.value}
              </span>
              <button
                type="button"
                className="ml-1 inline-flex h-3 w-3 flex-shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-muted hover:text-foreground focus:outline-none sm:h-4 sm:w-4"
                onClick={() => onRemove(filter.id)}
              >
                <X className="h-2 w-2 sm:h-3 sm:w-3" />
                <span className="sr-only">Remover filtro {filter.name}</span>
              </button>
            </span>
          ))}
          <button
            type="button"
            className="cursor-pointer text-[10px] whitespace-nowrap text-muted-foreground underline underline-offset-2 hover:text-foreground sm:text-xs"
            onClick={onClearAll}
          >
            Limpar tudo
          </button>
        </div>
      </div>
    </div>
  );
}
