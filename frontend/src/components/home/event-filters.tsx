"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterChipsBreadcrumb } from "@/components/ui/filter-chips-breadcrumb";

const ALL = "__all__";

interface EventFiltersProps {
  cities: [string, number][];
  categories: [string, number][];
  selectedCity: string | null;
  selectedCategory: string | null;
  searchTerm: string;
  onChangeCity: (city: string | null) => void;
  onChangeCategory: (category: string | null) => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

// Filtro único: um botão "Filtros" abre um painel com Cidade e
// Categoria juntos (a lista de cidades soltas em botões, tipo
// "Todas as cidades" clicável na tela toda, saiu — vira só uma opção
// dentro do mesmo lugar). Os filtros já aplicados continuam visíveis
// como chips removíveis (FilterChipsBreadcrumb) sem precisar reabrir o
// painel.
export function EventFilters({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  searchTerm,
  onChangeCity,
  onChangeCategory,
  onClearSearch,
  onClearAll,
}: EventFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [searchTerm, selectedCity, selectedCategory].filter(Boolean).length;

  const chips = [
    ...(searchTerm ? [{ id: "search", name: "Busca", value: searchTerm }] : []),
    ...(selectedCity ? [{ id: "city", name: "Cidade", value: selectedCity }] : []),
    ...(selectedCategory ? [{ id: "category", name: "Categoria", value: selectedCategory }] : []),
  ];

  function handleRemoveChip(id: string) {
    if (id === "search") onClearSearch();
    if (id === "city") onChangeCity(null);
    if (id === "category") onChangeCategory(null);
  }

  return (
    <div className="space-y-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="size-3.5" />
            Filtros
            {activeCount > 0 && (
              <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Refine por local e categoria do evento.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cidade</label>
              <Select
                value={selectedCity ?? ALL}
                onValueChange={(value) => onChangeCity(value === ALL ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as cidades</SelectItem>
                  {cities.map(([city, count]) => (
                    <SelectItem key={city} value={city}>
                      {city} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={selectedCategory ?? ALL}
                onValueChange={(value) => onChangeCategory(value === ALL ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as categorias</SelectItem>
                  {categories.map(([category, count]) => (
                    <SelectItem key={category} value={category}>
                      {category} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={onClearAll}>
              Limpar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <FilterChipsBreadcrumb
        filters={chips}
        onRemove={handleRemoveChip}
        onClearAll={onClearAll}
        className="max-w-sm"
      />
    </div>
  );
}
