import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCountdown, useCountdown } from "./use-countdown";

describe("formatCountdown", () => {
  it("formata minutos e segundos com o segundo sempre em 2 dígitos", () => {
    expect(formatCountdown(65_000)).toBe("1:05");
  });

  it("formata sete minutos redondos (duração padrão do hold de assento)", () => {
    expect(formatCountdown(7 * 60_000)).toBe("7:00");
  });

  it("chega a zero como 0:00", () => {
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("trunca frações de segundo em vez de arredondar", () => {
    expect(formatCountdown(1_999)).toBe("0:01");
  });
});

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("conta o tempo restante até o horário alvo", () => {
    const target = new Date("2026-08-16T12:07:00.000Z").toISOString();
    const { result } = renderHook(() => useCountdown(target));

    expect(result.current).toBe(7 * 60_000);
  });

  it("diminui conforme o tempo passa", () => {
    const target = new Date("2026-08-16T12:07:00.000Z").toISOString();
    const { result } = renderHook(() => useCountdown(target));

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current).toBe(6 * 60_000);
  });

  it("nunca fica negativo depois que o horário alvo já passou", () => {
    const target = new Date("2026-08-16T12:00:30.000Z").toISOString();
    const { result } = renderHook(() => useCountdown(target));

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(result.current).toBe(0);
  });

  it("devolve zero quando não há horário alvo (nenhum hold ativo)", () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current).toBe(0);
  });
});
