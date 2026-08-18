import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  saveConsent,
  subscribeConsent,
} from "./cookie-consent";

describe("cookie-consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("não tem escolha salva antes de qualquer decisão", () => {
    expect(getConsentSnapshot()).toBeNull();
  });

  it("servidor sempre trata como indecidido, mesmo com escolha salva no cliente", () => {
    saveConsent("all");
    expect(getConsentServerSnapshot()).toBeNull();
  });

  it("guarda e devolve a escolha", () => {
    saveConsent("essential");
    expect(getConsentSnapshot()).toBe("essential");
  });

  it("ignora lixo salvo diretamente no localStorage por fora da lib", () => {
    window.localStorage.setItem("cookie_consent", "qualquer-coisa");
    expect(getConsentSnapshot()).toBeNull();
  });

  it("notifica listeners inscritos quando a escolha muda", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeConsent(listener);

    saveConsent("all");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveConsent("essential");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
