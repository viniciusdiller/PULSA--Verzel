import { useEffect, useState } from "react";

// Atrasa a propagação de um valor que muda rápido (ex. cada tecla digitada
// num campo de busca) — sem isso, cada letra digitada dispara uma
// requisição nova, o que estourava o rate-limit do endpoint de catálogo
// em poucos segundos de digitação.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
