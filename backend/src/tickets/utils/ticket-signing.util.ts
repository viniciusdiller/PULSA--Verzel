import { randomBytes, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

export interface TicketQrPayload {
  ticketId: string;
  eventId: string;
  serial: string;
}

// Erro de domínio (não uma HttpException do Nest) — este util é
// framework-agnóstico de propósito; quem chama (o módulo Gate) decide
// como mapear isso para uma resposta HTTP/status de portaria.
export class InvalidTicketQrError extends Error {
  constructor(message = 'Código de ingresso inválido ou adulterado.') {
    super(message);
    this.name = 'InvalidTicketQrError';
  }
}

export function generateSerial(): string {
  return randomUUID();
}

// Token opaco para o link de compartilhamento — não é o JWT do QR nem
// contém o id interno do ingresso.
export function generateShareSlug(): string {
  return randomBytes(9).toString('base64url');
}

export function signTicketQr(payload: TicketQrPayload, secret: string): string {
  // Sem `expiresIn`: o ingresso precisa continuar válido até o evento
  // acontecer. "Expiração" é modelada pelo campo `status` do Ticket
  // (VALID/USED/VOID), não por uma claim `exp` do JWT.
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

export function verifyTicketQr(token: string, secret: string): TicketQrPayload {
  let decoded: unknown;

  try {
    // Algoritmo fixado em HS256 — impede "alg confusion attack" (ex.
    // alguém forjar um token com alg=none ou trocar para um esquema
    // assimétrico onde o "secret" seria tratado como chave pública).
    decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch {
    throw new InvalidTicketQrError();
  }

  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).ticketId !== 'string' ||
    typeof (decoded as Record<string, unknown>).eventId !== 'string' ||
    typeof (decoded as Record<string, unknown>).serial !== 'string'
  ) {
    throw new InvalidTicketQrError();
  }

  const payload = decoded as Record<string, unknown>;
  return {
    ticketId: payload.ticketId as string,
    eventId: payload.eventId as string,
    serial: payload.serial as string,
  };
}
