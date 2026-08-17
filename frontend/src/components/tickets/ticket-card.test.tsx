import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TicketCard } from "./ticket-card";
import type { TicketWithDetails } from "@/types/ticket";

const mutateAsync = vi.fn();

vi.mock("@/hooks/use-tickets", () => ({
  useCancelPaidTicketMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function futureIso(daysFromNow = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function pastIso(daysAgo = 1): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function baseTicket(overrides: Partial<TicketWithDetails> = {}): Omit<TicketWithDetails, "ownerId"> {
  return {
    id: "ticket-1",
    reservationId: "res-1",
    eventId: "event-1",
    seatId: "seat-1",
    serial: "serial-1",
    qrToken: "qr-token",
    shortCode: "123456",
    status: "VALID",
    usedAt: null,
    usedByGateUserId: null,
    shareSlug: "share-slug",
    createdAt: new Date().toISOString(),
    event: {
      id: "event-1",
      title: "Matrix",
      imageUrl: null,
      startsAt: futureIso(),
      venueName: "Cine PULSA",
      venueCity: "São Paulo",
    },
    seat: { id: "seat-1", row: "A", number: 1, label: "A1" },
    ...overrides,
  };
}

describe("TicketCard — cancelamento pós-pagamento", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("não mostra botão de cancelar quando allowCancel é false (ex. página pública de compartilhamento)", () => {
    render(<TicketCard ticket={baseTicket()} />);
    expect(screen.queryByRole("button", { name: /cancelar ingresso/i })).not.toBeInTheDocument();
  });

  it("não mostra botão de cancelar pra ingresso já utilizado", () => {
    render(<TicketCard ticket={baseTicket({ status: "USED" })} allowCancel />);
    expect(screen.queryByRole("button", { name: /cancelar ingresso/i })).not.toBeInTheDocument();
  });

  it("não mostra botão de cancelar quando o evento já aconteceu", () => {
    render(
      <TicketCard
        ticket={baseTicket({ event: { ...baseTicket().event, startsAt: pastIso() } })}
        allowCancel
      />,
    );
    expect(screen.queryByRole("button", { name: /cancelar ingresso/i })).not.toBeInTheDocument();
  });

  it("mostra o botão e abre o diálogo de confirmação com o nome do evento", async () => {
    const user = userEvent.setup();
    render(<TicketCard ticket={baseTicket()} allowCancel />);

    await user.click(screen.getByRole("button", { name: /cancelar ingresso/i }));

    expect(screen.getByText('Cancelar ingresso de "Matrix"?')).toBeInTheDocument();
  });

  it("confirma o cancelamento chamando a mutation com o id da reserva e mostra o valor reembolsado", async () => {
    mutateAsync.mockResolvedValue({ refundedCents: 5000, reservation: { id: "res-1" } });
    const user = userEvent.setup();
    render(<TicketCard ticket={baseTicket()} allowCancel />);

    await user.click(screen.getByRole("button", { name: /cancelar ingresso/i }));
    // Dois botões com esse rótulo agora: o que abre o diálogo e o de
    // confirmar dentro dele — o de confirmar é o último a aparecer no DOM.
    const confirmButtons = screen.getAllByRole("button", { name: /cancelar ingresso/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(mutateAsync).toHaveBeenCalledWith("res-1");
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("R$"));
  });

  it("mostra a mensagem de erro do backend quando a cancelação falha", async () => {
    mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Este ingresso já foi utilizado." } },
    });
    const user = userEvent.setup();
    render(<TicketCard ticket={baseTicket()} allowCancel />);

    await user.click(screen.getByRole("button", { name: /cancelar ingresso/i }));
    const confirmButtons = screen.getAllByRole("button", { name: /cancelar ingresso/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(toastError).toHaveBeenCalledWith("Este ingresso já foi utilizado.");
  });
});
