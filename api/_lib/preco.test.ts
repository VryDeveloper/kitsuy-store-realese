import { describe, expect, it } from "vitest";
import { precoEmCentavos } from "./preco.js";

describe("precoEmCentavos", () => {
  it("converte o texto formatado do Firestore", () => {
    expect(precoEmCentavos("R$ 260,00")).toBe(26000);
    expect(precoEmCentavos("R$ 1.260,50")).toBe(126050);
    expect(precoEmCentavos("R$ 0,99")).toBe(99);
  });

  it("retorna NaN quando não há número", () => {
    expect(precoEmCentavos("Consulte")).toBeNaN();
    expect(precoEmCentavos(undefined)).toBeNaN();
  });
});
