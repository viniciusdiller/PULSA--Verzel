import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GateResult } from "./gate-result";
import type { GateValidationResult } from "@/types/gate";

const ticket = {
  ticketId: "ticket-1",
  seatLabel: "A12",
  eventTitle: "Matrix",
};

describe("GateResult", () => {
  it.each<[GateValidationResult["outcome"], string]>([
    ["VALID", "Válido"],
    ["ALREADY_USED", "Já utilizado"],
    ["WRONG_EVENT", "Evento errado"],
    ["INVALID", "Inválido"],
  ])("mostra o rótulo certo pro desfecho %s", (outcome, expectedLabel) => {
    const result: GateValidationResult = { outcome, message: "mensagem qualquer" };

    render(<GateResult result={result} onDismiss={vi.fn()} />);

    expect(screen.getByRole("heading", { name: expectedLabel })).toBeInTheDocument();
  });

  it("mostra a mensagem retornada pelo backend", () => {
    const result: GateValidationResult = { outcome: "VALID", message: "Ingresso válido!" };

    render(<GateResult result={result} onDismiss={vi.fn()} />);

    expect(screen.getByText("Ingresso válido!")).toBeInTheDocument();
  });

  it("mostra assento e evento quando o resultado traz um ticket", () => {
    const result: GateValidationResult = { outcome: "VALID", message: "ok", ticket };

    render(<GateResult result={result} onDismiss={vi.fn()} />);

    expect(screen.getByText("Assento A12")).toBeInTheDocument();
    expect(screen.getByText("Matrix")).toBeInTheDocument();
  });

  it("não mostra bloco de assento quando o resultado não traz ticket (ex. código inválido)", () => {
    const result: GateValidationResult = { outcome: "INVALID", message: "Código não encontrado" };

    render(<GateResult result={result} onDismiss={vi.fn()} />);

    expect(screen.queryByText(/^Assento /)).not.toBeInTheDocument();
  });

  it("mostra data/hora de validação só no caso ALREADY_USED, quando presente", () => {
    const result: GateValidationResult = {
      outcome: "ALREADY_USED",
      message: "já foi validado antes",
      usedAt: "2026-08-16T12:00:00.000Z",
    };

    render(<GateResult result={result} onDismiss={vi.fn()} />);

    expect(screen.getByText(/Validado em/)).toBeInTheDocument();
  });

  it("chama onDismiss ao clicar em 'Validar próximo'", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const result: GateValidationResult = { outcome: "VALID", message: "ok" };

    render(<GateResult result={result} onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "Validar próximo" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
