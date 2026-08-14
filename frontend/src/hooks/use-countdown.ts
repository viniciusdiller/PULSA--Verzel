import { useEffect, useState } from "react";

export function useCountdown(targetIso: string | null): number {
  const [remainingMs, setRemainingMs] = useState(() =>
    targetIso ? new Date(targetIso).getTime() - Date.now() : 0,
  );

  useEffect(() => {
    if (!targetIso) return;

    const target = new Date(targetIso).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return Math.max(0, remainingMs);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
