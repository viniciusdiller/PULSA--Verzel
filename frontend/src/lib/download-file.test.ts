import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./download-file";

describe("downloadBlob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("cria um link temporário com o nome do arquivo e revoga a URL depois do clique", () => {
    const blob = new Blob(["conteúdo"], { type: "text/csv" });
    const objectUrl = "blob:pulsa-test";
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue(objectUrl);
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    vi.useFakeTimers();

    downloadBlob(blob, "pulsa-validacoes.csv");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);
    vi.useRealTimers();
  });
});
