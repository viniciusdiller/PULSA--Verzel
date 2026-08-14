-- Token JWT assinado (HMAC) armazenado no ingresso, gerado uma única vez
-- na emissão. Guardá-lo evita reassinar (e mudar) o conteúdo do QR a cada
-- vez que o ingresso é consultado — o QR do cliente precisa ser estável.
ALTER TABLE "tickets" ADD COLUMN "qrToken" TEXT NOT NULL;
CREATE UNIQUE INDEX "tickets_qrToken_key" ON "tickets"("qrToken");
