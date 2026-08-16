import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterChipsBreadcrumb } from "./filter-chips-breadcrumb";

describe("FilterChipsBreadcrumb", () => {
  it("não renderiza nada quando não há filtro ativo", () => {
    const { container } = render(
      <FilterChipsBreadcrumb filters={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra um chip por filtro ativo, com nome e valor", () => {
    render(
      <FilterChipsBreadcrumb
        filters={[
          { id: "city", name: "Cidade", value: "São Paulo" },
          { id: "category", name: "Categoria", value: "Shows" },
        ]}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByText("Cidade: São Paulo")).toBeInTheDocument();
    expect(screen.getByText("Categoria: Shows")).toBeInTheDocument();
  });

  it("chama onRemove com o id certo ao clicar no X de um chip", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <FilterChipsBreadcrumb
        filters={[{ id: "city", name: "Cidade", value: "São Paulo" }]}
        onRemove={onRemove}
        onClearAll={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remover filtro cidade/i }));

    expect(onRemove).toHaveBeenCalledWith("city");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("chama onClearAll ao clicar em 'Limpar tudo'", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();

    render(
      <FilterChipsBreadcrumb
        filters={[{ id: "city", name: "Cidade", value: "São Paulo" }]}
        onRemove={vi.fn()}
        onClearAll={onClearAll}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Limpar tudo" }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
