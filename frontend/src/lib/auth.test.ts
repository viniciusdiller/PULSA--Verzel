import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSession,
  getStoredUser,
  loginRedirectPath,
  roleHomePath,
  roleLabel,
  roleNavLabel,
  saveSession,
  updateStoredUser,
  type AuthUser,
} from "./auth";

const user: AuthUser = {
  id: "user-1",
  email: "cliente1@elitedev.dev",
  name: "Cliente Um",
  role: "CUSTOMER",
};

describe("roleHomePath", () => {
  it("manda organizador pra /organizer", () => {
    expect(roleHomePath("ORGANIZER")).toBe("/organizer");
  });

  it("manda portaria pra /gate", () => {
    expect(roleHomePath("GATE_STAFF")).toBe("/gate");
  });

  it("manda cliente pra /my-tickets", () => {
    expect(roleHomePath("CUSTOMER")).toBe("/my-tickets");
  });
});

describe("loginRedirectPath", () => {
  it("manda portaria direto pro trabalho dela (mesmo destino de roleHomePath)", () => {
    expect(loginRedirectPath("GATE_STAFF")).toBe("/gate");
  });

  it("manda cliente e organizador pra home pública, não pra área própria", () => {
    expect(loginRedirectPath("CUSTOMER")).toBe("/");
    expect(loginRedirectPath("ORGANIZER")).toBe("/");
  });
});

describe("roleLabel / roleNavLabel", () => {
  it("traduz cada papel pro rótulo em português esperado", () => {
    expect(roleLabel("ORGANIZER")).toBe("Organizador");
    expect(roleLabel("CUSTOMER")).toBe("Cliente");
    expect(roleLabel("GATE_STAFF")).toBe("Portaria");
  });

  it("dá um rótulo de navegação específico pra cada papel", () => {
    expect(roleNavLabel("ORGANIZER")).toBe("Meus eventos");
    expect(roleNavLabel("CUSTOMER")).toBe("Meus ingressos");
    expect(roleNavLabel("GATE_STAFF")).toBe("Portaria");
  });
});

describe("sessão em localStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("não tem usuário nenhum antes de qualquer login", () => {
    expect(getStoredUser()).toBeNull();
  });

  it("guarda token e usuário, e devolve o usuário salvo", () => {
    saveSession("um-token-jwt", user);

    expect(window.localStorage.getItem("access_token")).toBe("um-token-jwt");
    expect(getStoredUser()).toEqual(user);
  });

  it("atualiza só o usuário guardado, sem mexer no token", () => {
    saveSession("um-token-jwt", user);
    updateStoredUser({ ...user, name: "Novo Nome" });

    expect(window.localStorage.getItem("access_token")).toBe("um-token-jwt");
    expect(getStoredUser()?.name).toBe("Novo Nome");
  });

  it("limpa token e usuário no logout", () => {
    saveSession("um-token-jwt", user);
    clearSession();

    expect(window.localStorage.getItem("access_token")).toBeNull();
    expect(getStoredUser()).toBeNull();
  });
});
