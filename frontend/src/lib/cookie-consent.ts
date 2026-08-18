export type CookieConsent = "all" | "essential";

const CONSENT_KEY = "cookie_consent";

type Listener = () => void;
let listeners: Listener[] = [];

// useSyncExternalStore precisa de subscribe/getSnapshot pra ler localStorage
// com segurança fora de um efeito (a alternativa óbvia — useState + useEffect
// — dispara o lint react-hooks/set-state-in-effect e ainda corre risco de
// mismatch de hidratação, já que o servidor não tem acesso a localStorage).
export function subscribeConsent(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getConsentSnapshot(): CookieConsent | null {
  const raw = window.localStorage.getItem(CONSENT_KEY);
  return raw === "all" || raw === "essential" ? raw : null;
}

// No servidor não dá pra saber a escolha salva — trata como "ainda não
// decidiu", igual ao primeiro paint no cliente antes de reidratar.
export function getConsentServerSnapshot(): CookieConsent | null {
  return null;
}

export function saveConsent(consent: CookieConsent) {
  window.localStorage.setItem(CONSENT_KEY, consent);
  listeners.forEach((listener) => listener());
}
