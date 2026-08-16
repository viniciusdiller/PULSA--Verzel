import { describe, expect, it } from "vitest";
import { formatCentsToBRL, formatEventDate, formatEventDateTime } from "./format";

// Intl.NumberFormat("pt-BR", { style: "currency" }) separa "R$" do valor
// com um espaço NAO separavel (U+00A0), nao um espaco comum. Um literal
// "R$ 50,00" digitado a mao no teste pareceria identico no editor mas
// falharia sempre (Object.is diferencia os dois caracteres). Por isso
// montamos o esperado via String.fromCharCode(160), que garante o
// caractere certo independente de como o editor exibe um espaco.
const NBSP = String.fromCharCode(160);

function brl(value: string): string {
  return "R$" + NBSP + value;
}

describe("formatCentsToBRL", () => {
  it("converte centavos para reais no formato brasileiro", () => {
    expect(formatCentsToBRL(5000)).toBe(brl("50,00"));
  });

  it("mantém duas casas decimais mesmo em valores redondos em reais", () => {
    expect(formatCentsToBRL(10000)).toBe(brl("100,00"));
  });

  it("arredonda centavos quebrados corretamente", () => {
    expect(formatCentsToBRL(1999)).toBe(brl("19,99"));
  });

  it("trata zero como R$ 0,00", () => {
    expect(formatCentsToBRL(0)).toBe(brl("0,00"));
  });
});

describe("formatEventDate", () => {
  it("formata uma data ISO no padrão dia/mês abreviado/ano em pt-BR", () => {
    expect(formatEventDate("2026-12-01T12:00:00.000Z")).toBe("01 de dez. de 2026");
  });
});

describe("formatEventDateTime", () => {
  it("inclui hora e minuto além da data", () => {
    const result = formatEventDateTime("2026-12-01T12:00:00.000Z");
    expect(result).toContain("2026");
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});
