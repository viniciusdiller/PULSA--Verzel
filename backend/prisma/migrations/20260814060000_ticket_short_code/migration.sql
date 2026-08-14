-- Código curto (6 dígitos) como alternativa ao JWT do qrToken só para
-- digitação manual na portaria — o QR real continua sendo o qrToken. A
-- aplicação garante unicidade na emissão (retry em colisão), mas a
-- constraint no banco é a rede de segurança de verdade.
ALTER TABLE "tickets" ADD COLUMN "shortCode" VARCHAR(6);

-- Backfill dos ingressos já emitidos (dados de teste locais): cada linha
-- recebe um código sequencial determinístico, só para satisfazer a
-- constraint NOT NULL/UNIQUE abaixo sem colidir entre si.
UPDATE "tickets"
SET "shortCode" = lpad((100000 + sub.row_num)::text, 6, '0')
FROM (
  SELECT id, row_number() OVER (ORDER BY "createdAt") AS row_num
  FROM "tickets"
) AS sub
WHERE "tickets".id = sub.id;

ALTER TABLE "tickets" ALTER COLUMN "shortCode" SET NOT NULL;

CREATE UNIQUE INDEX "tickets_shortCode_key" ON "tickets"("shortCode");
