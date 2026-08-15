"use client";

import { useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { runThemeTransition } from "@/lib/theme-transition";

const noopSubscribe = () => () => {};

// O tema real só é conhecido depois do mount (next-themes lê o
// localStorage no cliente) — renderizar o ícone antes disso causaria
// hydration mismatch entre servidor e cliente. useSyncExternalStore com
// snapshots diferentes de servidor/cliente é o jeito idiomático de adiar
// isso sem precisar de setState dentro de um efeito.
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsClient();
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!mounted) {
    return <div className="size-8" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  function handleToggle() {
    const next = isDark ? "light" : "dark";
    const rect = buttonRef.current?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    runThemeTransition(origin, () => setTheme(next));
  }

  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={handleToggle}
      className="overflow-hidden rounded-full"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}
          className="flex"
        >
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
