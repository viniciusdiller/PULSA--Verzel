import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Autenticação via localStorage + header Authorization (não cookie
// httpOnly cross-domain) — trade-off documentado no README: mais simples
// de acertar entre domínios Vercel/Railway dentro do prazo, ao custo de
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
