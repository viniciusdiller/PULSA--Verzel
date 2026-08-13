import { BadRequestException } from '@nestjs/common';

export interface PaymentOutcome {
  approved: boolean;
  declineReason?: string;
}

// Números de teste documentados no README/seed, mesmo espírito dos
// cartões de teste do Stripe: resultado sempre previsível pra quem avalia.
const ALWAYS_APPROVE = '4242424242424242';
const ALWAYS_DECLINE = '4000000000000002';

export function normalizeCardNumber(cardNumber: string): string {
  return cardNumber.replace(/[\s-]/g, '');
}

export function isValidCardNumberFormat(cardNumber: string): boolean {
  return /^\d{13,19}$/.test(cardNumber);
}

export function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = Number(cardNumber[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function simulatePayment(rawCardNumber: string): PaymentOutcome {
  const cardNumber = normalizeCardNumber(rawCardNumber);

  if (!isValidCardNumberFormat(cardNumber)) {
    throw new BadRequestException('Número de cartão em formato inválido.');
  }

  if (cardNumber === ALWAYS_APPROVE) {
    return { approved: true };
  }
  if (cardNumber === ALWAYS_DECLINE) {
    return {
      approved: false,
      declineReason: 'Cartão recusado pela operadora (simulado).',
    };
  }

  if (!luhnCheck(cardNumber)) {
    throw new BadRequestException('Número de cartão inválido.');
  }

  // Qualquer outro cartão Luhn-válido: aprova/recusa pelo último dígito,
  // pra dar variedade determinística sem depender só dos dois números fixos.
  const lastDigit = Number(cardNumber[cardNumber.length - 1]);
  const approved = lastDigit % 2 === 0;

  return approved
    ? { approved: true }
    : {
        approved: false,
        declineReason: 'Cartão recusado pela operadora (simulado).',
      };
}
