import jwt from 'jsonwebtoken';
import {
  generateSerial,
  generateShareSlug,
  generateShortCode,
  InvalidTicketQrError,
  SHORT_CODE_PATTERN,
  signTicketQr,
  verifyTicketQr,
} from './ticket-signing.util';

const SECRET = 'a-strong-enough-test-secret-1234567890';
const OTHER_SECRET = 'a-completely-different-secret-0987654321';

describe('signTicketQr / verifyTicketQr', () => {
  it('round-trip: assina e verifica, obtendo de volta exatamente o mesmo payload', () => {
    const payload = {
      ticketId: 'ticket-1',
      eventId: 'event-1',
      serial: 'serial-1',
    };

    const token = signTicketQr(payload, SECRET);
    const result = verifyTicketQr(token, SECRET);

    expect(result).toEqual(payload);
  });

  it('gera um token diferente de uma string simples com o id (não é um QR "ingênuo")', () => {
    const token = signTicketQr(
      { ticketId: 't1', eventId: 'e1', serial: 's1' },
      SECRET,
    );

    expect(token).not.toBe('t1');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('rejeita um token assinado com um secret diferente (adulteração/forja)', () => {
    const token = signTicketQr(
      { ticketId: 't1', eventId: 'e1', serial: 's1' },
      OTHER_SECRET,
    );

    expect(() => verifyTicketQr(token, SECRET)).toThrow(InvalidTicketQrError);
  });

  it('rejeita uma string que não é um JWT válido', () => {
    expect(() => verifyTicketQr('isso-nao-e-um-jwt', SECRET)).toThrow(
      InvalidTicketQrError,
    );
    expect(() => verifyTicketQr('', SECRET)).toThrow(InvalidTicketQrError);
  });

  it('rejeita um token assinado com alg=none (alg confusion attack)', () => {
    const forged = jwt.sign(
      { ticketId: 't1', eventId: 'e1', serial: 's1' },
      null,
      {
        algorithm: 'none',
      },
    );

    expect(() => verifyTicketQr(forged, SECRET)).toThrow(InvalidTicketQrError);
  });

  it('rejeita um token validamente assinado com o secret certo mas faltando campos do payload', () => {
    const incomplete = jwt.sign({ ticketId: 't1', eventId: 'e1' }, SECRET, {
      algorithm: 'HS256',
    });

    expect(() => verifyTicketQr(incomplete, SECRET)).toThrow(
      InvalidTicketQrError,
    );
  });

  it('rejeita um token expirado (defesa extra, mesmo não usando exp por padrão)', () => {
    const expired = jwt.sign(
      { ticketId: 't1', eventId: 'e1', serial: 's1' },
      SECRET,
      {
        algorithm: 'HS256',
        expiresIn: -10,
      },
    );

    expect(() => verifyTicketQr(expired, SECRET)).toThrow(InvalidTicketQrError);
  });
});

describe('generateSerial', () => {
  it('gera identificadores únicos a cada chamada', () => {
    const values = new Set(Array.from({ length: 50 }, () => generateSerial()));
    expect(values.size).toBe(50);
  });
});

describe('generateShareSlug', () => {
  it('gera um token opaco, URL-safe e único a cada chamada', () => {
    const values = new Set(
      Array.from({ length: 50 }, () => generateShareSlug()),
    );
    expect(values.size).toBe(50);

    const slug = generateShareSlug();
    expect(slug).not.toMatch(/[+/=]/);
  });
});

describe('generateShortCode', () => {
  it('gera sempre 6 dígitos numéricos, com zero à esquerda quando necessário', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateShortCode()).toMatch(SHORT_CODE_PATTERN);
    }
  });

  it('varia entre chamadas (não é um valor fixo)', () => {
    const values = new Set(
      Array.from({ length: 50 }, () => generateShortCode()),
    );
    expect(values.size).toBeGreaterThan(1);
  });
});
