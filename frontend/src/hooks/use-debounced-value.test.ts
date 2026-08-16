import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa devolvendo o valor inicial, sem esperar nenhum delay", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 450));
    expect(result.current).toBe("a");
  });

  it("não propaga o novo valor antes do delay passar", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 450), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("a");
  });

  it("propaga o valor mais recente depois do delay completo", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 450), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(result.current).toBe("ab");
  });

  it("reinicia a contagem a cada tecla nova, propagando só o último valor digitado", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 450), {
      initialProps: { value: "m" },
    });

    rerender({ value: "ma" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ value: "mat" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Passaram 600ms no total, mas o timer reiniciou na 2ª tecla — sem
    // completar 450ms desde a última mudança, ainda não deve ter propagado.
    expect(result.current).toBe("m");

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current).toBe("mat");
  });
});
