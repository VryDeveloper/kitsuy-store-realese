import { describe, expect, it } from "vitest";
import { formatarMoeda, precoEmReais } from "./preco";

describe("precoEmReais", () => {
  it("converte o texto formatado", () => {
    expect(precoEmReais("R$ 260,00")).toBe(260);
    expect(precoEmReais("R$ 1.260,50")).toBe(1260.5);
  });
  it("retorna 0 quando não há número", () => {
    expect(precoEmReais("Consulte")).toBe(0);
  });
});

describe("formatarMoeda", () => {
  it("formata em reais", () => {
    expect(formatarMoeda(1260.5).replace(/\s/g, " ")).toBe("R$ 1.260,50");
  });
});
