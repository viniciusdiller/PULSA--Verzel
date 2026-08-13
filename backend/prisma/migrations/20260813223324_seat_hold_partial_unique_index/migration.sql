-- Garantia real (fonte de verdade) de que o mesmo assento nunca tem mais de uma
-- reserva "ativa" (em hold ou paga) simultaneamente. O Prisma DSL não expressa
-- índice único com cláusula WHERE, então essa constraint é adicionada à mão.
-- Vale mesmo com bug de aplicação, retry de rede, ou múltiplas instâncias do
-- backend rodando em paralelo (a aplicação além disso usa pg_advisory_xact_lock
-- por seatId para serializar as tentativas concorrentes e devolver um erro claro
-- antes mesmo de chegar nessa constraint).
CREATE UNIQUE INDEX "reservations_active_seat_unique"
ON "reservations" ("seatId")
WHERE "status" IN ('HOLDING', 'PAID');
