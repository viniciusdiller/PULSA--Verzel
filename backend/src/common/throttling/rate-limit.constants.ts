/**
 * Limites específicos por rota, além do teto global de 60 req/min.
 *
 * A chave usada pelo Throttler é o IP do cliente (o bootstrap configura
 * `trust proxy` para que isso continue correto atrás do Render). Os valores
 * são deliberadamente confortáveis para uma sessão normal e restritivos
 * contra polling abusivo, enumeração de links e brute force.
 */
export const RATE_LIMITS = {
  login: { limit: 5, ttl: 60_000 },
  catalogSearch: { limit: 30, ttl: 60_000 },
  catalogDetail: { limit: 20, ttl: 60_000 },
  publicEventList: { limit: 30, ttl: 60_000 },
  publicFeaturedEvents: { limit: 30, ttl: 60_000 },
  publicEventDetail: { limit: 40, ttl: 60_000 },
  publicSeatMap: { limit: 30, ttl: 60_000 },
  sharedTicket: { limit: 20, ttl: 60_000 },
} as const;
