import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutContent } from "./page";
import type { AuthUser } from "@/lib/auth";
import type { Profile } from "@/types/profile";
import type { SeatMapResponse } from "@/types/event";
import type { PayResult, Reservation, Ticket } from "@/types/reservation";

const EVENT_ID = "event-1";
const RESERVATION_ID = "reservation-1";
const SEAT_ID = "seat-1";
const mocks = vi.hoisted(() => ({
  user: null as AuthUser | null,
  profile: null as Profile | null,
  seatMap: null as SeatMapResponse | null,
  countdownMs: 420_000,
  holdMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  payMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  cancelMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mocks.user,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-events", () => ({
  useSeatMapQuery: () => ({
    data: mocks.seatMap,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfileQuery: () => ({ data: mocks.profile }),
}));

vi.mock("@/hooks/use-reservation", () => ({
  useHoldSeatMutation: () => mocks.holdMutation,
  usePayReservationMutation: () => mocks.payMutation,
  useCancelReservationMutation: () => mocks.cancelMutation,
}));

vi.mock("@/hooks/use-countdown", () => ({
  useCountdown: () => mocks.countdownMs,
  formatCountdown: (milliseconds: number) => `${Math.ceil(milliseconds / 60_000)}:00`,
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

function baseSeatMap(): SeatMapResponse {
  return {
    event: {
      id: EVENT_ID,
      title: "Festival PULSA",
      startsAt: "2099-10-20T20:00:00.000Z",
      externalSource: "TICKETMASTER",
    },
    sections: [
      {
        id: "section-1",
        eventId: EVENT_ID,
        name: "Pista",
        priceCents: 5_000,
        rowsCount: 1,
        seatsPerRow: 2,
        colorHex: "#7c3aed",
      },
    ],
    seats: [
      {
        id: SEAT_ID,
        sectionId: "section-1",
        row: "A",
        number: 1,
        label: "A1",
        status: "AVAILABLE",
      },
      {
        id: "seat-2",
        sectionId: "section-1",
        row: "A",
        number: 2,
        label: "A2",
        status: "HELD",
      },
    ],
  };
}

function baseReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: RESERVATION_ID,
    eventId: EVENT_ID,
    seatId: SEAT_ID,
    customerId: "customer-1",
    status: "HOLDING",
    holdExpiresAt: "2099-10-20T19:07:00.000Z",
    totalCents: 5_000,
    balanceAppliedCents: 0,
    paymentCardLast4: null,
    paymentDeclineReason: null,
    createdAt: "2099-10-20T19:00:00.000Z",
    updatedAt: "2099-10-20T19:00:00.000Z",
    ...overrides,
  };
}

function baseTicket(): Ticket {
  return {
    id: "ticket-1",
    reservationId: RESERVATION_ID,
    eventId: EVENT_ID,
    seatId: SEAT_ID,
    ownerId: "customer-1",
    serial: "PULSA-000001",
    qrToken: "signed-qr-token",
    shortCode: "123456",
    status: "VALID",
    usedAt: null,
    usedByGateUserId: null,
    shareSlug: "shared-ticket-1",
    createdAt: "2099-10-20T19:00:00.000Z",
  };
}

function renderCheckout() {
  return render(<CheckoutContent eventId={EVENT_ID} />);
}

async function selectAndHoldSeat(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: /escolha seu assento/i });
  await user.click(screen.getByRole("button", { name: "1" }));
  await user.click(screen.getByRole("button", { name: /confirmar assento/i }));
  await waitFor(() => expect(mocks.holdMutation.mutateAsync).toHaveBeenCalledWith(SEAT_ID));
}

async function reserveFirstSeat(user: ReturnType<typeof userEvent.setup>) {
  await selectAndHoldSeat(user);
  await screen.findByText("Pagamento");
}

describe("CheckoutPage — jornada de reserva e pagamento", () => {
  beforeEach(() => {
    mocks.user = {
      id: "customer-1",
      email: "cliente@pulsa.test",
      name: "Cliente PULSA",
      role: "CUSTOMER",
    };
    mocks.profile = {
      id: "customer-1",
      email: "cliente@pulsa.test",
      name: "Cliente PULSA",
      role: "CUSTOMER",
      createdAt: "2099-01-01T00:00:00.000Z",
      balanceCents: 0,
      statsCount: 0,
      statsLabel: "Ingressos",
    };
    mocks.seatMap = baseSeatMap();
    mocks.countdownMs = 420_000;
    mocks.holdMutation.mutateAsync.mockReset();
    mocks.payMutation.mutateAsync.mockReset();
    mocks.cancelMutation.mutateAsync.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.holdMutation.mutateAsync.mockResolvedValue(baseReservation());
    mocks.cancelMutation.mutateAsync.mockResolvedValue(baseReservation({ status: "CANCELED" }));
  });

  it("seleciona um assento, cria o hold e conclui um pagamento aprovado com cartão", async () => {
    const approvedResult: PayResult = {
      reservation: baseReservation({ status: "PAID", holdExpiresAt: null }),
      ticket: baseTicket(),
    };
    mocks.payMutation.mutateAsync.mockResolvedValue(approvedResult);
    const user = userEvent.setup();

    renderCheckout();
    await reserveFirstSeat(user);
    await user.type(screen.getByLabelText(/número do cartão/i), "4242 4242 4242 4242");
    await user.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => {
      expect(mocks.payMutation.mutateAsync).toHaveBeenCalledWith({
        reservationId: RESERVATION_ID,
        cardNumber: "4242 4242 4242 4242",
        useBalance: false,
      });
    });
    expect(await screen.findByRole("heading", { name: "Pagamento aprovado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver meu ingresso/i })).toHaveAttribute(
      "href",
      "/my-tickets",
    );
  });

  it("exibe o motivo quando o pagamento é recusado e permite tentar novamente", async () => {
    const declinedResult: PayResult = {
      reservation: baseReservation({
        status: "DECLINED",
        paymentDeclineReason: "Cartão recusado pela operadora.",
      }),
      ticket: null,
    };
    mocks.payMutation.mutateAsync.mockResolvedValue(declinedResult);
    const user = userEvent.setup();

    renderCheckout();
    await reserveFirstSeat(user);
    await user.type(screen.getByLabelText(/número do cartão/i), "4000 0000 0000 0002");
    await user.click(screen.getByRole("button", { name: "Pagar" }));

    expect(await screen.findByRole("heading", { name: "Pagamento recusado" })).toBeInTheDocument();
    expect(screen.getByText("Cartão recusado pela operadora.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("aplica o saldo integral e não envia cartão quando o saldo cobre a reserva", async () => {
    mocks.profile = { ...mocks.profile!, balanceCents: 5_000 };
    mocks.payMutation.mutateAsync.mockResolvedValue({
      reservation: baseReservation({ status: "PAID", balanceAppliedCents: 5_000, holdExpiresAt: null }),
      ticket: baseTicket(),
    } satisfies PayResult);
    const user = userEvent.setup();

    renderCheckout();
    await reserveFirstSeat(user);
    await user.click(screen.getByRole("checkbox", { name: /usar meu saldo/i }));

    expect(screen.getByText(/seu saldo cobre o total/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/número do cartão/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => {
      expect(mocks.payMutation.mutateAsync).toHaveBeenCalledWith({
        reservationId: RESERVATION_ID,
        useBalance: true,
      });
    });
    expect(await screen.findByRole("heading", { name: "Pagamento aprovado" })).toBeInTheDocument();
  });

  it("mostra a expiração do hold e libera a reserva ao voltar para o mapa", async () => {
    mocks.countdownMs = 0;
    const user = userEvent.setup();

    renderCheckout();
    await selectAndHoldSeat(user);

    expect(screen.getByText("Expirado")).toBeInTheDocument();
    expect(screen.getByText(/tempo da sua reserva esgotou/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voltar ao mapa" }));

    await waitFor(() => {
      expect(mocks.cancelMutation.mutateAsync).toHaveBeenCalledWith(RESERVATION_ID);
    });
    expect(await screen.findByRole("heading", { name: /escolha seu assento/i })).toBeInTheDocument();
  });
});
