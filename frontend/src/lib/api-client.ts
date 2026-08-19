import axios from "axios";
import { clearSession } from "@/lib/auth";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Autenticação via localStorage + header Authorization (não cookie
// httpOnly cross-domain) — trade-off documentado no README: mais simples
// de acertar entre domínios Vercel/Render dentro do prazo, ao custo de
// uma exposição maior a XSS do que um cookie teria.
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Um 401 numa chamada que LEVAVA token só pode significar sessão
// morta (expirada, revogada, ou o backend reiniciou e trocou o
// segredo do JWT) — não tem re-tentativa nem tela que resolva isso,
// então desloga e manda pro login em vez de deixar cada página
// (perfil, organizador, portaria...) se virar sozinha com um estado
// quebrado. Checar `Authorization` no config (em vez de, por exemplo,
// a URL bater com "/auth/login") garante que credencial errada no
// login continua caindo no catch de cada formulário normalmente —
// aquela chamada nunca carrega token pra começo de conversa.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.headers?.Authorization
    ) {
      clearSession();
      if (window.location.pathname !== "/login") {
        // Fora de um Client Component (isso é um interceptor do axios, sem
        // acesso a useRouter) — e um reload duro aqui é proposital, pra
        // zerar cache do React Query e o store de auth junto com o token.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- ver comentário acima
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
