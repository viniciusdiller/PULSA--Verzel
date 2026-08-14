export type Role = "ORGANIZER" | "CUSTOMER" | "GATE_STAFF";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

export function saveSession(accessToken: string, user: AuthUser) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function roleHomePath(role: Role): string {
  switch (role) {
    case "ORGANIZER":
      return "/organizer";
    case "GATE_STAFF":
      return "/gate";
    case "CUSTOMER":
    default:
      return "/my-tickets";
  }
}

export function roleNavLabel(role: Role): string {
  switch (role) {
    case "ORGANIZER":
      return "Meus eventos";
    case "GATE_STAFF":
      return "Portaria";
    case "CUSTOMER":
    default:
      return "Meus ingressos";
  }
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "ORGANIZER":
      return "Organizador";
    case "GATE_STAFF":
      return "Portaria";
    case "CUSTOMER":
    default:
      return "Cliente";
  }
}
