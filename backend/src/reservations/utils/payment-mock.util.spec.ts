import { BadRequestException } from '@nestjs/common';
import {
  isValidCardNumberFormat,
  luhnCheck,
  normalizeCardNumber,
  simulatePayment,
} from './payment-mock.util';

describe('normalizeCardNumber', () => {
  it('remove espaços e hífens', () => {
    expect(normalizeCardNumber('4242 4242 4242 4242')).toBe('4242424242424242');
    expect(normalizeCardNumber('4242-4242-4242-4242')).toBe('4242424242424242');
  });
});

describe('isValidCardNumberFormat', () => {
  it('aceita apenas dígitos com 13 a 19 caracteres', () => {
    expect(isValidCardNumberFormat('4242424242424242')).toBe(true);
    expect(isValidCardNumberFormat('123456789012')).toBe(false); // 12 dígitos, curto demais
    expect(isValidCardNumberFormat('12345678901234567890')).toBe(false); // 20 dígitos, longo demais
    expect(isValidCardNumberFormat('4242abcd42424242')).toBe(false);
  });
});

describe('luhnCheck', () => {
  it('valida números conhecidos como corretos/incorretos pelo algoritmo de Luhn', () => {
    expect(luhnCheck('4242424242424242')).toBe(true);
    expect(luhnCheck('4242424242424241')).toBe(false);
  });
});

describe('simulatePayment', () => {
  it('aprova sempre o número de teste fixo de aprovação', () => {
    expect(simulatePayment('4242 4242 4242 4242')).toEqual({ approved: true });
  });

  it('recusa sempre o número de teste fixo de recusa', () => {
    const result = simulatePayment('4000 0000 0000 0002');
    expect(result.approved).toBe(false);
    expect(result.declineReason).toBeTruthy();
  });

  it('aprova um cartão Luhn-válido genérico cujo último dígito é par', () => {
    expect(simulatePayment('5555555555554444').approved).toBe(true);
  });

  it('recusa um cartão Luhn-válido genérico cujo último dígito é ímpar', () => {
    const result = simulatePayment('4111111111111111');
    expect(result.approved).toBe(false);
    expect(result.declineReason).toBeTruthy();
  });

  it('rejeita com BadRequestException um cartão em formato inválido', () => {
    expect(() => simulatePayment('abcd')).toThrow(BadRequestException);
    expect(() => simulatePayment('123')).toThrow(BadRequestException);
  });

  it('rejeita com BadRequestException um cartão com formato válido mas checksum de Luhn inválido', () => {
    expect(() => simulatePayment('4242424242424241')).toThrow(
      BadRequestException,
    );
  });
});
