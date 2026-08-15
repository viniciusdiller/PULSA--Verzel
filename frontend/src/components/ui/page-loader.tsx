import { LoaderSignalBars } from "@/components/ui/loader-signal-bars";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  label?: string;
  className?: string;
}

// Padrão único de carregamento do site inteiro — nada de skeleton ou
// spinner genérico em outro lugar, sempre este componente.
export function PageLoader({ label = "Carregando...", className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground",
        className,
      )}
    >
      <LoaderSignalBars size="lg" variant="equalizer" className="text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
