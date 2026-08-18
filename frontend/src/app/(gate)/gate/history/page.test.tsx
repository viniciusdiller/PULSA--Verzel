import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GateHistoryPage from "./page";
import type { GateHistoryEventsPage } from "@/types/gate";

const mocks = vi.hoisted(() => ({
  historyQuery: vi.fn(),
  exportMutation: vi.fn(),
  downloadBlob: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/use-gate", () => ({
  useGateHistoryEventsQuery: mocks.historyQuery,
  useExportGateHistoryCsv: mocks.exportMutation,
}));

vi.mock("@/hooks/use-debounced-value", () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock("@/components/gate/gate-history-event-section", () => ({
  GateHistoryEventSection: ({ event }: { event: { eventTitle: string } }) => (
    <article>{event.eventTitle}</article>
  ),
}));

vi.mock("@/lib/download-file", () => ({
  downloadBlob: mocks.downloadBlob,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

function historyData(
  overrides: Partial<GateHistoryEventsPage> = {},
): GateHistoryEventsPage {
  return {
    items: [
      {
        eventId: "event-1",
        eventTitle: "Festival PULSA",
        imageUrl: null,
        venueCity: "São Paulo",
        startsAt: "2026-08-20T20:00:00.000Z",
        validatedCount: 3,
        lastValidatedAt: "2026-08-18T20:00:00.000Z",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 4,
    ...overrides,
  };
}

describe("GateHistoryPage — busca e exportação operacional", () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.historyQuery.mockReturnValue({
      data: historyData(),
      isLoading: false,
      isPlaceholderData: false,
    });
    mocks.exportMutation.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
  });

  it("envia a busca textual ao backend e reinicia na primeira página", async () => {
    const user = userEvent.setup();
    render(<GateHistoryPage />);

    await user.type(
      screen.getByRole("textbox", { name: /buscar evento/i }),
      "festival",
    );

    expect(mocks.historyQuery).toHaveBeenLastCalledWith(1, 4, "festival");
  });

  it("exporta o histórico com o filtro atual e confirma o download", async () => {
    const blob = new Blob(["Evento,Assento"], { type: "text/csv" });
    mutateAsync.mockResolvedValue(blob);
    const user = userEvent.setup();
    render(<GateHistoryPage />);

    await user.type(
      screen.getByRole("textbox", { name: /buscar evento/i }),
      "festival",
    );
    await user.click(screen.getByRole("button", { name: /exportar csv/i }));

    expect(mutateAsync).toHaveBeenCalledWith("festival");
    expect(mocks.downloadBlob).toHaveBeenCalledWith(
      blob,
      expect.stringMatching(/^pulsa-validacoes-\d{4}-\d{2}-\d{2}\.csv$/),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Histórico exportado com sucesso.",
    );
  });

  it("desabilita exportação quando não há validações para baixar", () => {
    mocks.historyQuery.mockReturnValue({
      data: historyData({ items: [], total: 0 }),
      isLoading: false,
      isPlaceholderData: false,
    });
    render(<GateHistoryPage />);

    expect(
      screen.getByRole("button", { name: /exportar csv/i }),
    ).toBeDisabled();
    expect(screen.getByText(/você ainda não validou/i)).toBeInTheDocument();
  });
});
