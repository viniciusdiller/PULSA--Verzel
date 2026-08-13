export const EVENTS_LIMITS = {
  MIN_ROWS: 1,
  MAX_ROWS: 50,
  MIN_SEATS_PER_ROW: 1,
  MAX_SEATS_PER_ROW: 50,
  MIN_SECTIONS: 1,
  MAX_SECTIONS: 20,
  // Teto prático para o mapa de assentos continuar renderizável/interativo
  // numa demo — não é uma limitação técnica do banco.
  MAX_EVENT_CAPACITY: 300,
} as const;
